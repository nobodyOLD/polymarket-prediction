"use server";

export interface PolymarketEvent {
    id: string;
    title: string;
    description: string;
    outcomes: string[];
    outcomePrices: string[];
    volume: string;
    url: string;
    endDate: string; // New field
}

const BASE_URL = "https://gamma-api.polymarket.com";

export async function fetchPolymarketEvents(query: string = "Bitcoin"): Promise<PolymarketEvent[]> {
    try {
        const response = await fetch(
            `${BASE_URL}/events?limit=5&active=true&closed=false&q=${encodeURIComponent(query)}&order=volume&ascending=false`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) {
            console.error("Polymarket API error:", response.statusText);
            return [];
        }

        const data = await response.json();

        return data.map((event: any) => {
            // Data is often nested in 'markets' array
            const market = event.markets?.[0];

            let prices = market?.outcomePrices || event.outcomePrices || [];
            let outcomes = market?.outcomes || event.outcomes || [];
            let endDate = market?.endDate || event.endDateIso || ""; // Iso date might be just YYYY-MM-DD

            // Parse JSON strings if needed
            if (typeof prices === 'string') {
                try { prices = JSON.parse(prices); } catch (e) { prices = []; }
            }
            if (typeof outcomes === 'string') {
                try { outcomes = JSON.parse(outcomes); } catch (e) { outcomes = []; }
            }

            if (!Array.isArray(prices)) prices = [];
            if (!Array.isArray(outcomes)) outcomes = [];

            return {
                id: event.id,
                title: event.title,
                description: event.description,
                outcomes: outcomes,
                outcomePrices: prices,
                volume: event.volume,
                url: `https://polymarket.com/event/${event.slug}`,
                endDate: endDate
            };
        });

    } catch (error) {
        console.error("Failed to fetch Polymarket data:", error);
        return [];
    }
}
