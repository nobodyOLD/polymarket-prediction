import { AnalysisResult } from "@/lib/analysis";

interface GlobalSummaryProps {
    results: AnalysisResult[];
}

export function GlobalSummary({ results }: GlobalSummaryProps) {
    const bullishCount = results.filter(r => r.direction === 'UP').length;
    const bearishCount = results.filter(r => r.direction === 'DOWN').length;
    const neutralCount = results.filter(r => r.direction === 'NEUTRAL').length;

    let bias = 'NEUTRAL';
    let biasColor = 'text-gray-400';

    if (bullishCount > bearishCount && bullishCount >= 3) {
        bias = 'BULLISH';
        biasColor = 'text-green-500';
    } else if (bearishCount > bullishCount && bearishCount >= 3) {
        bias = 'BEARISH';
        biasColor = 'text-red-500';
    }

    const avgConfidence = Math.round(
        results.length > 0
            ? results.reduce((acc, curr) => acc + curr.confidence, 0) / results.length
            : 0
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl mb-8">
            <div>
                <h4 className="text-xs text-gray-500 uppercase mb-1">Dominant Bias</h4>
                <p className={`text-lg font-bold ${biasColor}`}>{bias}</p>
            </div>

            <div>
                <h4 className="text-xs text-gray-500 uppercase mb-1">Signal Strength</h4>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{avgConfidence}%</span>
                    <div className="h-1.5 w-16 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${bias === 'BULLISH' ? 'bg-green-500' : bias === 'BEARISH' ? 'bg-red-500' : 'bg-gray-500'}`}
                            style={{ width: `${avgConfidence}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-xs text-gray-500 uppercase mb-1">Bullish / Bearish</h4>
                <p className="text-sm text-gray-300">
                    <span className="text-green-400 font-bold">{bullishCount}</span> Up
                    <span className="mx-2 text-gray-600">|</span>
                    <span className="text-red-400 font-bold">{bearishCount}</span> Down
                </p>
            </div>

            <div>
                <h4 className="text-xs text-gray-500 uppercase mb-1">Timeframes</h4>
                <p className="text-lg font-bold text-white">{results.length} / 5 Active</p>
            </div>
        </div>
    );
}
