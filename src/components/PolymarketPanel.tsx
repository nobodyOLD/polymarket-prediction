"use client";

import { useEffect, useState } from 'react';
import { fetchPolymarketEvents, PolymarketEvent } from '@/lib/polymarket';
import { ExternalLink, TrendingUp, Loader2, Clock } from 'lucide-react';

function Countdown({ date }: { date: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const calculateTime = () => {
            const end = new Date(date).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) return "Ended";

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m ${seconds}s`; // Show seconds if under 1 hour
        };

        setTimeLeft(calculateTime());
        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000); // Update every second
        return () => clearInterval(timer);
    }, [date]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}</span>
        </div>
    );
}

export function PolymarketPanel({ query }: { query: string }) {
    const [events, setEvents] = useState<PolymarketEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        const fetchData = () => {
            fetchPolymarketEvents(query)
                .then(data => {
                    if (mounted) {
                        setEvents(data);
                        setLoading(false);
                    }
                })
                .catch(err => {
                    console.error("Polymarket fetch error:", err);
                    if (mounted) setLoading(false);
                });
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [query]);

    if (loading) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 h-32">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs text-gray-500">Loading Sentiment...</span>
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Sentiment
                </h3>
                <p className="text-xs text-gray-500">No active prediction markets found for {query}.</p>
            </div>
        );
    }

    // Take top 3 events by volume
    const topEvents = events.slice(0, 3);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Sentiment (Polymarket)
            </h3>

            <div className="space-y-4">
                {topEvents.map((event) => {
                    const yesIndex = event.outcomes?.findIndex((o: string) => o === "Yes") ?? -1;
                    // Fallback for non-Yes/No markets or different naming
                    const priceIndex = yesIndex !== -1 ? yesIndex : 0;
                    const outcomeLabel = yesIndex !== -1 ? "YES" : (event.outcomes?.[0] || "N/A");

                    const price = parseFloat(event.outcomePrices?.[priceIndex] || "0");
                    const percentage = Math.round(price * 100);

                    return (
                        <div key={event.id} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                            <a href={event.url} target="_blank" rel="noopener noreferrer" className="group block">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <p className="text-xs font-medium text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
                                        {event.title}
                                    </p>
                                    {event.endDate && <Countdown date={event.endDate} />}
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${percentage > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-mono font-bold ${percentage > 50 ? 'text-green-400' : 'text-red-400'}`}>
                                        {percentage}% {outcomeLabel}
                                    </span>
                                </div>
                            </a>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 text-[10px] text-gray-600 text-center">
                Probabilities via Polymarket • Not financial advice
            </div>
        </div>
    );
}
