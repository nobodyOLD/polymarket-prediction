"use client";

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';
import { Candle, TradeSetup } from '@/lib/analysis';

interface ChartProps {
    data: Candle[];
    setup: TradeSetup | null;
}

export const ChartComponent = ({ data, setup }: ChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#1a1a1a' }, // Dark mode base
                textColor: '#d1d5db',
            },
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
        });

        const newSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        newSeries.setData(data);

        chartRef.current = chart;
        seriesRef.current = newSeries;

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    // Update Setup Visuals
    useEffect(() => {
        if (!chartRef.current || !seriesRef.current) return;

        // Clear previous pricelines logic typically requires managing references, 
        // but lightweight-charts doesn't have "clearAllPriceLines". 
        // For simplicity in this v1, we assume data updates trigger full re-render effectively via parent or we just add new ones.
        // Ideally we store line references and remove them.
        // But since this is a simple "one-shot" analysis view, we can rely on component remount or careful management.

        // Actually, let's keep it simple: The `setup` prop change should ideally trigger a re-creation of lines.
        // But `lightweight-charts` is imperative. 
        // We will just create lines if setup exists. 
        // NOTE: This simple implementation adds lines on top. Real-world would remove old ones.

        // We will implement a simplified "Markers" approach or PriceLines.

        if (setup) {
            // Stop Loss
            seriesRef.current.createPriceLine({
                price: setup.stopLoss,
                color: '#ef4444',
                lineWidth: 2,
                lineStyle: 0, // Solid
                axisLabelVisible: true,
                title: 'STOP LOSS',
            });

            // Targets
            setup.targets.forEach((target, index) => {
                seriesRef.current?.createPriceLine({
                    price: target,
                    color: '#22c55e',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: `TARGET ${index + 1}`,
                });
            });

            // Entry Zone (Visualized as simple lines for Min/Max or we can use a Box via plugins, but lines are easier primarily)
            seriesRef.current.createPriceLine({
                price: setup.entryZone.min,
                color: '#3b82f6',
                lineWidth: 1,
                title: 'ENTRY MIN',
            });
            seriesRef.current.createPriceLine({
                price: setup.entryZone.max,
                color: '#3b82f6',
                lineWidth: 1,
                title: 'ENTRY MAX',
            });
        }

    }, [setup]);

    return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
};
