import { AnalysisResult } from '@/lib/analysis';
import { AlertTriangle, Info, ShieldCheck, Target } from 'lucide-react';

interface SignalCardProps {
    result: AnalysisResult | null;
}

export const SignalCard = ({ result }: SignalCardProps) => {
    const setup = result?.tradeSetup;

    if (!result || !setup) {
        return (
            <div className="bg-gray-900 rounded-xl p-6 text-center text-gray-400 border border-gray-800">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No clear setup detected on this timeframe.</p>
                <p className="text-sm mt-2 text-gray-600">
                    {result ? "Market condition is neutral or conflicting." : "Loading analysis..."}
                </p>
                {result && result.explanation.length > 0 && (
                    <div className="mt-4 text-xs text-gray-500 text-left">
                        <p className="font-semibold mb-1">Detected:</p>
                        <ul className="list-disc ml-4 space-y-1">
                            {result.explanation.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    const isLong = result.direction === 'UP';
    const rrColor = setup.riskRewardRatio >= 1.5 ? 'text-green-400' : 'text-orange-400';

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden text-gray-100 flex flex-col gap-4">
            {/* Header */}
            <div className={`p-4 flex justify-between items-center ${isLong ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                        {result.direction === 'UP' ? 'LONG' : 'SHORT'}
                    </span>
                    {setup.riskRewardRatio < 1.5 && (
                        <span className="text-xs bg-orange-900 text-orange-200 px-2 py-1 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low R:R
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-400">Confidence</div>
                    <div className="font-bold text-lg">{result.confidence}%</div>
                </div>
            </div>

            <div className="p-4 space-y-6">

                {/* Entry / Stop / Target Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                        <div className="text-xs text-blue-400 mb-1">ENTRY ZONE</div>
                        <div className="font-mono">{setup.entryZone.min.toFixed(2)} - {setup.entryZone.max.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-red-500">
                        <div className="text-xs text-red-400 mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> STOP LOSS</div>
                        <div className="font-mono text-white">{setup.stopLoss.toFixed(2)}</div>
                    </div>
                </div>

                <div className="space-y-2">
                    {setup.targets.map((t, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border-l-4 border-green-500">
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <Target className="w-4 h-4" /> TAKE PROFIT {i + 1}
                            </div>
                            <div className="font-mono font-bold">{t.toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                    <span className="text-sm text-gray-400">Risk : Reward</span>
                    <span className={`font-bold font-mono ${rrColor}`}>1 : {setup.riskRewardRatio}</span>
                </div>

                {/* Education / Reasons */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-gray-300 border-b border-gray-700 pb-1">Analysis Logic</h4>
                    <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                        {result.explanation.map((reason, i) => (
                            <li key={i}>{reason}</li>
                        ))}
                    </ul>
                </div>

            </div>

            <div className="bg-gray-950 p-2 text-center text-[10px] text-gray-600">
                NOT FINANCIAL ADVICE. FOR EDUCATIONAL PURPOSES ONLY.
            </div>
        </div>
    );
};
