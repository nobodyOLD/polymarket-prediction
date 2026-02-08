"use server";

import { Candle } from './analysis';


const BASE_URL = 'https://api.binance.com/api/v3';

export async function fetchCandles(symbol: string = 'BTCUSDT', interval: string = '1h'): Promise<Candle[]> {
    try {
        const response = await fetch(`${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=500`);
        if (!response.ok) {
            throw new Error('Failed to fetch data from Binance');
        }
        const data = await response.json();

        // Binance response format:
        // [
        //   [
        //     1499040000000,      // Open time
        //     "0.01634790",       // Open
        //     "0.80000000",       // High
        //     "0.01575800",       // Low
        //     "0.01577100",       // Close
        //     "148976.11427815",  // Volume
        //     ...
        //   ]
        // ]

        return data.map((d: any) => ({
            // Lightweight charts wants seconds for time
            time: (d[0] / 1000) as any,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
        }));
    } catch (error) {
        console.error('Error fetching candles:', error);
        return [];
    }
}

export async function fetchMultiFrameCandles(symbol: string): Promise<Record<string, Candle[]>> {
    const timeframes = ['5m', '15m', '1h', '4h', '1d'];
    const promises = timeframes.map(tf => fetchCandles(symbol, tf));

    try {
        const results = await Promise.all(promises);
        const data: Record<string, Candle[]> = {};

        timeframes.forEach((tf, index) => {
            data[tf] = results[index];
        });

        return data;
    } catch (error) {
        console.error('Error fetching multi-frame candles:', error);
        return {
            '5m': [], '15m': [], '1h': [], '4h': [], '1d': []
        };
    }
}

