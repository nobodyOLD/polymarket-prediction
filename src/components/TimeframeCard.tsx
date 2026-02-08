import { AnalysisResult } from "@/lib/analysis";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { CandleTimer } from "./CandleTimer";

interface TimeframeCardProps {
    result: AnalysisResult | null;
    loading: boolean;
    onClick: () => void;
    isActive: boolean;
}

export function TimeframeCard({ result, loading, onClick, isActive }: TimeframeCardProps) {
    if (loading || !result) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 animate-pulse h-32">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-800 rounded w-1/2"></div>
            </div>
        );
    }

    const { timeframe, direction, confidence, explanation } = result;

    let colorClass = "text-gray-400";
    let bgClass = "bg-gray-900 border-gray-800";
    let Icon = Minus;

    if (direction === 'UP') {
        colorClass = "text-green-500";
        bgClass = "bg-green-900/10 border-green-900/30";
        Icon = ArrowUp;
    } else if (direction === 'DOWN') {
        colorClass = "text-red-500";
        bgClass = "bg-red-900/10 border-red-900/30";
        Icon = ArrowDown;
    }

    return (
        <div
            onClick={onClick}
            className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-blue-500' : ''} ${bgClass}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-400 uppercase">{timeframe}</span>
                    <CandleTimer timeframe={timeframe} variant="small" />
                </div>
                {isActive && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">View</span>}
            </div>

            <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <div>
                        <h3 className={`text-lg font-bold leading-none ${colorClass}`}>{direction}</h3>
                        <p className="text-[10px] text-gray-500">{confidence}% Conf.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 bg-black/20 p-2 rounded border border-white/5">
                    {/* Row 1: Asset Prices */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Entry</span>
                            <span className="text-xs font-mono text-gray-300">
                                ${result.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-blue-400 uppercase tracking-wider font-semibold">Asset Target</span>
                            <span className="text-xs font-mono text-blue-300 font-bold">
                                ${result.expectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Share Prices */}
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] text-yellow-500 uppercase tracking-wider font-semibold">Buy Share</span>
                            <span className="text-xs font-mono text-yellow-400 font-bold">
                                {((Math.max(0, result.confidence - 5)) / 100).toFixed(2)} - {(result.confidence / 100).toFixed(2)}¢
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-green-500 uppercase tracking-wider font-semibold">Sell Share</span>
                            <span className="text-xs font-mono text-green-400 font-bold">
                                {(Math.min(99, result.confidence + 15) / 100).toFixed(2)}¢
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                {explanation.map((reason, idx) => (
                    <div key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        {reason}
                    </div>
                ))}
            </div>
        </div>
    );
}
