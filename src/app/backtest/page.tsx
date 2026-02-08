'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TIMEFRAMES = ['15m', '1h', '4h', '1d'];

export default function BacktestPage() {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [initialCapital, setInitialCapital] = useState(5);
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [results, setResults] = useState<Record<string, any>>({});

    const runBacktest = async (tf: string) => {
        setLoading(prev => ({ ...prev, [tf]: true }));
        try {
            const res = await fetch('/api/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, timeframe: tf, initialCapital })
            });
            const data = await res.json();
            setResults(prev => ({ ...prev, [tf]: data }));
        } catch (error) {
            console.error(`Backtest failed for ${tf}:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [tf]: false }));
        }
    };

    const runAllBacktests = () => {
        setResults({});
        TIMEFRAMES.forEach(tf => runBacktest(tf));
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Automated Backtest Engine
                    </h1>
                    <p className="text-sm text-slate-500">
                        Simulate strategy performance across multiple timeframes.
                    </p>
                </div>
            </header>

            {/* Controls */}
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Symbol</label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md h-9 px-3 py-1 w-[180px] focus:outline-none focus:ring-1 focus:ring-slate-500"
                        >
                            <option value="BTCUSDT">BTC/USDT</option>
                            <option value="ETHUSDT">ETH/USDT</option>
                            <option value="SOLUSDT">SOL/USDT</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Initial Capital ($)</label>
                        <input
                            type="number"
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md h-9 px-3 py-1 w-[120px] focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                    </div>

                    <Button
                        onClick={runAllBacktests}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        disabled={Object.values(loading).some(l => l)}
                    >
                        <PlayCircle size={16} />
                        Run Auto-Backtest
                    </Button>
                </CardContent>
            </Card>

            {/* Portfolio Summary Dashboard */}
            {Object.keys(results).length > 0 && (
                <Card className="bg-slate-900 border-slate-800 bg-gradient-to-br from-slate-900 to-blue-900/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Portfolio Overview
                            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                                {Object.keys(results).length} Strategies Active
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-sm text-slate-400">Total Net Profit</p>
                                <p className={`text-3xl font-bold ${Object.values(results).reduce((acc: number, r: any) => acc + r.metrics.netProfit, 0) >= 0
                                        ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    ${Object.values(results).reduce((acc: number, r: any) => acc + r.metrics.netProfit, 0).toFixed(2)}
                                </p>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-sm text-slate-400">Total ROI</p>
                                <p className={`text-3xl font-bold ${(Object.values(results).reduce((acc: number, r: any) => acc + r.metrics.netProfit, 0) / (initialCapital * Object.keys(results).length)) * 100 >= 0
                                        ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {((Object.values(results).reduce((acc: number, r: any) => acc + r.metrics.netProfit, 0) / (initialCapital * Object.keys(results).length)) * 100).toFixed(2)}%
                                </p>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-sm text-slate-400">Total Trades</p>
                                <p className="text-3xl font-bold text-slate-200">
                                    {Object.values(results).reduce((acc: number, r: any) => acc + r.metrics.totalTrades, 0)}
                                </p>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-sm text-slate-400">Total Capital</p>
                                <p className="text-3xl font-bold text-slate-200">
                                    ${(initialCapital * Object.keys(results).length).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {TIMEFRAMES.map((tf) => {
                    const result = results[tf];
                    const isLoading = loading[tf];

                    return (
                        <Card key={tf} className="bg-slate-900 border-slate-800 overflow-hidden relative min-h-[300px]">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20" />
                            <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row justify-between items-center">
                                <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                                        {tf}
                                    </span>
                                    {symbol}
                                </CardTitle>
                                {isLoading && <div className="text-xs text-blue-400 animate-pulse">Running Simulation...</div>}
                            </CardHeader>

                            <CardContent className="pt-4">
                                {result ? (
                                    <div className="space-y-4">
                                        {/* Metrics Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                                <div className="text-xs text-slate-500">Win Rate</div>
                                                <div className={`text-xl font-bold ${result.metrics.winRate > 50 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {result.metrics.winRate.toFixed(1)}%
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                                <div className="text-xs text-slate-500">Net PnL</div>
                                                <div className={`text-xl font-bold ${result.metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    ${result.metrics.netProfit.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                                <div className="text-xs text-slate-500">Trades</div>
                                                <div className="text-xl font-bold text-slate-200">
                                                    {result.metrics.totalTrades}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Equity Curve Mini */}
                                        <div className="h-[150px] w-full mt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={result.equityCurve}>
                                                    <YAxis domain={['auto', 'auto']} hide />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '12px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelStyle={{ display: 'none' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={result.metrics.netProfit >= 0 ? '#22c55e' : '#ef4444'}
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Recent Trades Preview */}
                                        <div className="space-y-2">
                                            <div className="text-xs text-slate-500 uppercase font-semibold">Recent Activity</div>
                                            {result.trades.slice(-3).reverse().map((t: any, i: number) => (
                                                <div key={i} className="flex justify-between text-xs p-2 bg-slate-800/30 rounded border border-slate-800">
                                                    <span className={t.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}>{t.direction}</span>
                                                    <span className={t.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                        {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                ) : (
                                    <div className="h-[250px] flex flex-col items-center justify-center text-slate-600 gap-2">
                                        <PlayCircle className="w-8 h-8 opacity-20" />
                                        <span>Ready to Simulate</span>
                                        <Button
                                            // variant="outline"  Removed unsupported props
                                            // size="sm" 
                                            onClick={() => runBacktest(tf)}
                                            className="mt-2 border border-slate-700 bg-transparent hover:bg-slate-800"
                                        >
                                            Run {tf} Only
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
