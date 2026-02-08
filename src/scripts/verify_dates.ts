
import { fetchPolymarketEvents } from '../lib/polymarket';

async function verify() {
    console.log("Fetching events...");
    const events = await fetchPolymarketEvents("Bitcoin");
    console.log(`Found ${events.length} events.`);
    events.forEach(e => {
        console.log(`Event: ${e.title}`);
        console.log(`  End Date: ${e.endDate}`);
        console.log(`  Outcomes: ${e.outcomes}`);
    });
}

verify();
