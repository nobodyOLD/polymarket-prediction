import { NextResponse } from 'next/server';
import { analyzeMarket, Candle, TradeSetup } from '@/lib/analysis';

// Reusing fetchCandles logic but adapting for server-side if needed, 
// or importing directly if it's safe. 
// Since binance.ts is "use server", we can import it.
import { fetchCandles } from '@/lib/binance';

interface BacktestResult {
    metrics: {
        totalTrades: number;
        wins: number;
        losses: number;
        winRate: number;
        netProfit: number;
        profitFactor: number;
        maxDrawdown: number;
    };
    trades: SimulatedTrade[];
    equityCurve: { time: string; value: number }[];
}

interface SimulatedTrade {
    entryTime: string;
    exitTime?: string;
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice?: number;
    pnl: number;
    pnlPercent: number;
    status: 'OPEN' | 'WIN' | 'LOSS';
    setup: TradeSetup;
}

export async function POST(request: Request) {
    try {
        const { symbol = 'BTCUSDT', timeframe = '1h', days = 30, initialCapital = 1000 } = await request.json();

        // 1. Fetch Historical Data
        // Binance API limit is 1000 candles per request usually.
        // We might need to fetch multiple batches for "days" duration.
        // For simplicity, let's just fetch 1000 candles (approx 40 days of 1h data).
        // If timeframe is smaller, 1000 candles cover less time.

        // We can just use the existing fetchCandles with a higher limit if possible,
        // or just accept the 500 limit for now and improve later if user asks.
        // The current fetchCandles has hardcoded limit=500. Let's use it for now 
        // to prove the concept, or create a local helper to fetch more.

        // Let's rely on the existing function for now. 500 hours is ~20 days.
        const candles = await fetchCandles(symbol, timeframe);

        if (candles.length < 50) {
            return NextResponse.json({ error: 'Insufficient data for backtesting' }, { status: 400 });
        }

        // 2. Run Simulation
        const trades: SimulatedTrade[] = [];
        let equity = initialCapital; // Starting capital
        const equityCurve = [{ time: new Date(Number(candles[0].time) * 1000).toISOString(), value: equity }];

        let activeTrade: SimulatedTrade | null = null;

        // We need at least ~50 candles for indicators to warm up
        const warmupPeriod = 50;

        for (let i = warmupPeriod; i < candles.length; i++) {
            const currentCandle = candles[i];
            const currentPrice = currentCandle.close;
            const currentTime = new Date(Number(currentCandle.time) * 1000).toISOString();

            // A. Manage Active Trade
            if (activeTrade) {
                let limitHit = false;
                let stopHit = false;

                // Check High/Low of current candle to see if TP/SL was hit
                // Assuming we are IN the candle, we check if price moved through our levels.
                // Conservative approach: 
                // - For LONG: Check Low against SL first? Or High against TP?
                //   In reality, we don't know intra-candle path.
                //   Common practice: Check if BOTH are hit in same candle -> erratic.
                //   Let's assume Worst Case (SL hit first) if both range covered, unless Open is closer to SL?
                //   Simplification: Just check Low <= SL and High >= TP.

                if (activeTrade.direction === 'LONG') {
                    if (currentCandle.low <= activeTrade.setup.stopLoss) {
                        stopHit = true;
                    } else if (currentCandle.high >= activeTrade.setup.targets[0]) {
                        // Start with Target 1 for simplicity of "WIN"
                        limitHit = true;
                    }
                } else { // SHORT
                    if (currentCandle.high >= activeTrade.setup.stopLoss) {
                        stopHit = true;
                    } else if (currentCandle.low <= activeTrade.setup.targets[0]) {
                        limitHit = true;
                    }
                }

                if (stopHit) {
                    // Close Trade as LOSS
                    activeTrade.exitPrice = activeTrade.setup.stopLoss;
                    activeTrade.exitTime = currentTime;
                    activeTrade.status = 'LOSS';

                    // Calculate PnL
                    const pnl = activeTrade.direction === 'LONG'
                        ? (activeTrade.setup.stopLoss - activeTrade.entryPrice) / activeTrade.entryPrice
                        : (activeTrade.entryPrice - activeTrade.setup.stopLoss) / activeTrade.entryPrice;

                    activeTrade.pnlPercent = pnl * 100;
                    activeTrade.pnl = equity * pnl; // Assume 100% equity used (risky but simple for calc)

                    equity += activeTrade.pnl;
                    trades.push(activeTrade);
                    activeTrade = null;
                } else if (limitHit) {
                    // Close Trade as WIN
                    activeTrade.exitPrice = activeTrade.setup.targets[0];
                    activeTrade.exitTime = currentTime;
                    activeTrade.status = 'WIN';

                    const pnl = activeTrade.direction === 'LONG'
                        ? (activeTrade.setup.targets[0] - activeTrade.entryPrice) / activeTrade.entryPrice
                        : (activeTrade.entryPrice - activeTrade.setup.targets[0]) / activeTrade.entryPrice;

                    activeTrade.pnlPercent = pnl * 100;
                    activeTrade.pnl = equity * pnl;

                    equity += activeTrade.pnl;
                    trades.push(activeTrade);
                    activeTrade = null;
                }
            }

            // B. Look for New Trade (if no active trade)
            if (!activeTrade) {
                // Need to pass a slice of candles up to 'i'
                const lookedAtCandles = candles.slice(0, i + 1);
                const analysis = analyzeMarket(lookedAtCandles, timeframe);

                if (analysis.tradeSetup) {
                    // We have a signal!
                    // Validate setup risk
                    // Enter trade at CLOSE of this candle (realistic backtest usually enters on OPEN of next, 
                    // but let's assume we implement signal at close)

                    activeTrade = {
                        entryTime: currentTime,
                        direction: analysis.direction === 'UP' ? 'LONG' : 'SHORT',
                        entryPrice: currentPrice,
                        setup: analysis.tradeSetup,
                        pnl: 0,
                        pnlPercent: 0,
                        status: 'OPEN'
                    };
                }
            }

            // Update Equity Curve
            equityCurve.push({ time: currentTime, value: equity });
        }

        // 3. Calculate Metrics
        const completedTrades = trades.filter(t => t.status !== 'OPEN');
        const wins = completedTrades.filter(t => t.status === 'WIN').length;
        const losses = completedTrades.filter(t => t.status === 'LOSS').length;
        const totalTrades = completedTrades.length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const netProfit = equity - initialCapital;

        // Profit Factor: Gross Profit / Gross Loss
        const grossProfit = completedTrades.reduce((acc, t) => acc + (t.pnl > 0 ? t.pnl : 0), 0);
        const grossLoss = completedTrades.reduce((acc, t) => acc + (t.pnl < 0 ? Math.abs(t.pnl) : 0), 0);
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

        // Max Drawdown calculation could be added here

        const result: BacktestResult = {
            metrics: {
                totalTrades,
                wins,
                losses,
                winRate,
                netProfit,
                profitFactor,
                maxDrawdown: 0 // Placeholder
            },
            trades: completedTrades, // Only return completed for now
            equityCurve
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Backtest error:', error);
        return NextResponse.json({ error: 'Failed to run backtest' }, { status: 500 });
    }
}
