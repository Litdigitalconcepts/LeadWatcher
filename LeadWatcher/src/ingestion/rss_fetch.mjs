// src/ingestion/rss_fetch.mjs
import Parser from "rss-parser";

const DEFAULT_FEED_URL = "https://techcrunch.com/feed/"; // swap later if you want

function pickFeedUrl() {
    // Allows: node src/ingestion/rss_fetch.mjs https://example.com/feed.xml
    const argUrl = process.argv[2];
    return argUrl?.startsWith("http") ? argUrl : DEFAULT_FEED_URL;
}



export async function fetchRssItems(options = {}) {
    const feedUrl = options.feedUrl || pickFeedUrl();
    const parser = new Parser();

    try {
        console.log(`\nFetching RSS feed: ${feedUrl}\n`);
        const feed = await parser.parseURL(feedUrl);
        const title = feed?.title ?? "(Untitled Feed)";
        const items = Array.isArray(feed?.items) ? feed.items : [];

        console.log(`Feed: ${title}`);
        console.log(`Items found: ${items.length}\n`);

        return items.map(item => ({
            ...item,
            source: title,
            feedUrl
        }));

    } catch (err) {
        console.error("❌ RSS fetch failed.");
        console.error("Reason:", err?.message ?? err);
        return [];
    }
}

async function main() {
    const items = await fetchRssItems();
    if (items.length === 0) {
        console.log("No items returned.");
        return;
    }

    // specific normalization requested
    const sampleItems = items.slice(0, 3).map(item => {
        return {
            source: item.source,
            feedUrl: item.feedUrl,
            title: item.title,
            url: item.link,
            publishedAt: item.pubDate || item.isoDate,
            fetchedAt: new Date().toISOString()
        };
    });

    console.log("Sample output (first 1-3 items):");
    console.log(JSON.stringify(sampleItems, null, 2));
    console.log("✅ Small Win: live headlines printed above.\n");
}

import { pathToFileURL } from "url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
