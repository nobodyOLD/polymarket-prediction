"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { GlobalSummary } from '@/components/GlobalSummary';
import { TimeframeCard } from '@/components/TimeframeCard';
import { analyzeMarket, AnalysisResult, Candle } from '@/lib/analysis';
import { fetchMultiFrameCandles } from '@/lib/binance';
import { SignalCard } from '@/components/SignalCard';
import { PolymarketPanel } from '@/components/PolymarketPanel';
import { CandleTimer } from '@/components/CandleTimer';

// Dynamic import for Chart to avoid SSR issues
const ChartComponent = dynamic(
  () => import('@/components/Chart').then((mod) => mod.ChartComponent),
  { ssr: false }
);

const PAIRS = [
  { id: 'BTCUSDT', label: 'Bitcoin (BTC)' },
  { id: 'ETHUSDT', label: 'Ethereum (ETH)' },
  { id: 'SOLUSDT', label: 'Solana (SOL)' },
  { id: 'BNBUSDT', label: 'Binance Coin (BNB)' },
  { id: 'XRPUSDT', label: 'Ripple (XRP)' },
  { id: 'ADAUSDT', label: 'Cardano (ADA)' },
  { id: 'DOGEUSDT', label: 'Dogecoin (DOGE)' },
];

const TIMEFRAMES = ['15m', '1h', '4h', '1d'];

const getPolyQuery = (pair: string) => {
  if (pair.includes('BTC')) return 'Bitcoin';
  if (pair.includes('ETH')) return 'Ethereum';
  if (pair.includes('SOL')) return 'Solana';
  if (pair.includes('BNB')) return 'Binance Coin';
  if (pair.includes('XRP')) return 'Ripple';
  if (pair.includes('ADA')) return 'Cardano';
  if (pair.includes('DOGE')) return 'Dogecoin';
  return 'Crypto';
};

export default function Home() {
  const [selectedPair, setSelectedPair] = useState<string>('BTCUSDT');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('1h');

  const [candlesData, setCandlesData] = useState<Record<string, Candle[]>>({});
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchMultiFrameCandles(selectedPair);
    setCandlesData(data);

    // Run analysis for all timeframes
    const results: AnalysisResult[] = [];
    TIMEFRAMES.forEach(tf => {
      if (data[tf]) {
        results.push(analyzeMarket(data[tf], tf));
      }
    });
    setAnalysisResults(results);
    setLastUpdated(new Date());
    setLoading(false);
  }, [selectedPair]);

  // Initial Load & Auto-Refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s Refresh (was 60s)
    return () => clearInterval(interval);
  }, [loadData]);

  // Active Data
  const activeCandles = candlesData[activeTimeframe] || [];
  const activeResult = analysisResults.find(r => r.timeframe === activeTimeframe) || null;

  return (
    <main className="min-h-screen bg-black text-gray-100 p-4 md:p-6 font-sans">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Market Intelligence Scale
            </h1>
            <p className="text-xs text-gray-500">Multi-Timeframe Analysis Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs text-gray-500">Last Update</p>
            <p className="text-xs font-mono text-gray-300">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
            </p>
          </div>

          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {PAIRS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          <Link href="/backtest" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition text-sm text-gray-300 flex items-center gap-2">
            <span>Backtest</span>
          </Link>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* GLOBAL SUMMARY */}
      <GlobalSummary results={analysisResults} />

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* LEFT: CHART AREA (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-1 shadow-2xl relative h-[500px]">
            {activeCandles.length > 0 ? (
              <ChartComponent
                key={activeTimeframe} // Force remount on TF change
                data={activeCandles}
                setup={activeResult?.tradeSetup || null}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600">
                {loading ? 'Loading Intelligence...' : 'No Data'}
              </div>
            )}

            {/* Overlay Info */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="bg-black/60 backdrop-blur px-3 py-1 rounded text-sm font-bold border border-white/10 text-white">
                {selectedPair}
              </div>
              <div className="bg-blue-600/90 backdrop-blur px-3 py-1 rounded text-sm font-bold border border-white/10 text-white">
                {activeTimeframe}
              </div>
              <CandleTimer timeframe={activeTimeframe} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIMEFRAMES.map(tf => {
              const res = analysisResults.find(r => r.timeframe === tf);
              return (
                <TimeframeCard
                  key={tf}
                  result={res || null}
                  loading={loading && !res}
                  isActive={activeTimeframe === tf}
                  onClick={() => setActiveTimeframe(tf)}
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT: SIGNAL DETAILS (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <SignalCard result={activeResult || null} />

          <PolymarketPanel query={getPolyQuery(selectedPair)} />

          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Analysis Logic</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <p>• <span className="text-gray-300">Confidence Scoring:</span> Weighted sum of EMA trend alignment, RSI momentum, and market structure.</p>
              <p>• <span className="text-gray-300">Conflict Penalty:</span> Scores are capped at 55% if indicators contradict (e.g. Trend Up + RSI Overbought).</p>
              <p>• <span className="text-gray-300">Risk Management:</span> Stop Loss derived from recent swing points + ATR buffer.</p>
            </div>
          </div>

          <div className="text-xs text-center text-gray-600 mt-8">
            <p>Not Financial Advice.</p>
            <p>Use for Educational Purposes Only.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
