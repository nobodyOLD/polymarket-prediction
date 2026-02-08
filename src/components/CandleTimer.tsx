"use client";

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CandleTimerProps {
    timeframe: string;
    variant?: 'large' | 'small';
}

export const CandleTimer = ({ timeframe, variant = 'large' }: CandleTimerProps) => {
    const [time, setTime] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const ms = now.getTime();

            let durationMs = 0;
            switch (timeframe) {
                case '15m': durationMs = 15 * 60 * 1000; break;
                case '1h': durationMs = 60 * 60 * 1000; break;
                case '4h': durationMs = 4 * 60 * 60 * 1000; break;
                case '1d': durationMs = 24 * 60 * 60 * 1000; break;
                default: return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            // Calculate next candle close time
            // For 1h, it's next hour :00. For 4h, it's 00:00, 04:00, etc.
            // Logic: CloseTime = Math.ceil(now / duration) * duration

            const nextClose = Math.ceil(ms / durationMs) * durationMs;
            const diff = nextClose - ms;

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Return object instead of string for separate styling
            return { days, hours, minutes, seconds };
        };

        const update = () => setTime(calculateTimeLeft());
        update(); // Initial call
        const interval = setInterval(update, 1000); // Update every second

        return () => clearInterval(interval);
    }, [timeframe]);

    if (!time) return null;

    if (variant === 'small') {
        const h = time.hours + (time.days * 24);
        const m = time.minutes.toString().padStart(2, '0');
        const s = time.seconds.toString().padStart(2, '0');
        const timeStr = h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;

        return (
            <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-mono font-medium text-gray-400">
                    {timeStr}
                </span>
            </div>
        );
    }

    // Render "Hours Mins" or "Mins Secs" depending on duration
    // If > 24h, show Days Hours
    // If > 1h, show Hours Mins
    // If < 1h, show Mins Secs (like screenshot)

    let primaryVal = 0;
    let secondaryVal = 0;
    let primaryLabel = "";
    let secondaryLabel = "";

    if (time.days > 0) {
        primaryVal = time.days;
        primaryLabel = "DAYS";
        secondaryVal = time.hours;
        secondaryLabel = "HRS";
    } else if (time.hours > 0) {
        primaryVal = time.hours;
        primaryLabel = "HRS";
        secondaryVal = time.minutes;
        secondaryLabel = "MINS";
    } else {
        primaryVal = time.minutes;
        primaryLabel = "MINS";
        secondaryVal = time.seconds;
        secondaryLabel = "SECS";
    }

    return (
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 shadow-lg">
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-red-500 leading-none font-mono">
                    {primaryVal.toString().padStart(2, '0')}
                </span>
                <span className="text-[9px] text-gray-500 font-bold tracking-wider">
                    {primaryLabel}
                </span>
            </div>
            <div className="text-gray-700 text-lg font-light leading-none pb-2">:</div>
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-red-500 leading-none font-mono">
                    {secondaryVal.toString().padStart(2, '0')}
                </span>
                <span className="text-[9px] text-gray-500 font-bold tracking-wider">
                    {secondaryLabel}
                </span>
            </div>
        </div>
    );
};
