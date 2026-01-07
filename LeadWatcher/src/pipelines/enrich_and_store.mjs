// src/pipelines/enrich_and_store.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Imports adjusted to match existing file structure and exports
import { fetchRssItems } from "../ingestion/rss_fetch.mjs";
import { analyzeHeadline } from "../enrichment/analyze_lead.mjs";

/**
 * Think of this pipeline like a bouncer + translator + librarian:
 * 1) fetchRssItems() pulls in people (headlines)
 * 2) dedupe check stops repeats at the door (by URL)
 * 3) analyzeHeadline() translates messy text into structured JSON
 * 4) Supabase insert files it away
 */

// --- Supabase client (keep it boring and reliable) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validates that we have the URL AND (at least one of the keys)
if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
    throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY in .env"
    );
}

// Uses Service Role if available, otherwise falls back to Anon Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// --- tiny utility: delay to avoid 429s (rate limiting) ---
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Retry helper ---
async function retrySupabaseOp(fn) {
    const delays = [500, 1000, 2000];
    for (let i = 0; i <= delays.length; i++) {
        const result = await fn();
        if (!result.error) return result;

        if (i < delays.length) {
            console.warn(`Supabase op failed (attempt ${i + 1}). Retrying in ${delays[i]}ms... Error: ${result.error.message || JSON.stringify(result.error)}`);
            await sleep(delays[i]);
        } else {
            return result; // Return the specific error on final fail
        }
    }
}

export async function runPipeline() {
    console.log("🔁 Pipeline starting...");

    const { data, error } = await retrySupabaseOp(() =>
        supabase.from("leads").select("id").limit(1)
    );
    if (error) {
        throw new Error("Supabase not reachable: " + JSON.stringify(error));
    }

    // Stats
    let stats = {
        fetched: 0,
        skippedDuplicates: 0,
        skippedLowSignal: 0,
        enrichmentFailures: 0,
        rateLimitErrors: 0,
        serverErrors: 0,
        dbInsertFailures: 0,
        enrichedSuccessfully: 0,
        inserted: 0
    };

    // 1) Fetch latest RSS items
    const items = await fetchRssItems(); // expects array like [{ title, link, ... }]

    if (!Array.isArray(items) || items.length === 0) {
        console.log("No RSS items returned. Nothing to do.");
        return;
    }
    console.log(`Fetched ${items.length} RSS items.`);
    stats.fetched = items.length;

    // 2) Loop through items sequentially (important for rate limits)
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const title = item?.title?.trim();
        // RSS-parser typical link field
        const url = item?.url?.trim() || item?.link?.trim();

        if (!title || !url) {
            console.log(`Skipping item ${i + 1}: missing title or url.`);
            continue;
        }

        console.log(`\n[${i + 1}/${items.length}] Checking: ${title}`);

        // 3) Deduplicate: do we already have this URL?
        // Mapped to 'source_url' based on your Supabase schema screenshot
        const { data: existing, error: dedupeError } = await retrySupabaseOp(() => supabase
            .from("leads")
            .select("id")
            .eq("source_url", url)
            .limit(1)
            .maybeSingle()
        );

        if (dedupeError) {
            console.error("Dedupe query failed:", dedupeError);
            // If dedupe fails, safest is to skip (prevents accidental duplicates + spend)
            continue;
        }

        if (existing) {
            const shortUrl = url.length > 50 ? url.slice(0, 50) + "..." : url;
            console.log(`⏭️  Duplicate found: source_url=${shortUrl}\n    Skipping enrichment.`);
            stats.skippedDuplicates++;
            continue;
        }

        // 4) Enrich (LLM) - costs money/time, so only do it after dedupe
        let enriched;
        try {
            enriched = await analyzeHeadlineWithRetry(title, stats);
        } catch (err) {
            console.error("Enrichment finally failed:", err.message);
            stats.enrichmentFailures++;
            // Don’t crash the whole pipeline because one headline was weird.
            await sleep(2000);
            continue;
        }
        stats.enrichedSuccessfully++;

        const company = enriched?.company ?? null;
        const amount = enriched?.funding_amount ?? enriched?.amount ?? null;

        // 5) Filter by signal quality
        // Only keep: funding, acquisition, partnership, hiring, product_launch
        const relevantEvents = ["funding", "acquisition", "partnership", "hiring", "product_launch"];
        const eventType = enriched?.event_type || "other";

        if (!relevantEvents.includes(eventType)) {
            console.log(`📉 Low signal (${eventType}). Skipping: ${title.slice(0, 50)}...`);
            stats.skippedLowSignal++;
            continue;
        }

        // 6) Store (map JSON keys -> Supabase columns)
        const rowToInsert = {
            // Mapped to actual Supabase columns from screenshot
            company: company,
            funding_amount: amount,
            source_url: url,
            headline: title,
            source: item.source || "RSS",
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            raw_ai: enriched, // Storing raw enrichment data
        };

        const { data: inserted, error: insertError } = await retrySupabaseOp(() => supabase
            .from("leads")
            .insert(rowToInsert)
            .select("id")
            .single()
        );

        if (insertError) {
            console.error("Insert failed:", insertError);
            stats.dbInsertFailures++;
        } else {
            console.log(`✅ Inserted lead id=${inserted?.id ?? "(unknown id)"}`);
            stats.inserted++;
        }

        // 6) Rate limiting (crucial): avoid 429s from OpenRouter
        await sleep(2000);
    }

    console.log("\n🎉 Pipeline finished.");
    console.log("-----------------------------------------");
    console.log(`Fetched: ${stats.fetched}`);
    console.log(`Skipped duplicates: ${stats.skippedDuplicates}`);
    console.log(`Skipped low signal: ${stats.skippedLowSignal}`);
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Enrichment failures: ${stats.enrichmentFailures}`);
    console.log(`  - Rate Limits (429): ${stats.rateLimitErrors}`);
    console.log(`  - Server Errors (5xx): ${stats.serverErrors}`);
    console.log(`DB insert failures: ${stats.dbInsertFailures}`);
    console.log(`Enriched successfully: ${stats.enrichedSuccessfully}`);
    console.log("-----------------------------------------");
}

async function analyzeHeadlineWithRetry(title, stats) {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await analyzeHeadline(title);
        } catch (err) {
            attempt++;
            const msg = String(err.message || err);

            // Basic detection logic
            const isRateLimit = msg.includes("429") || msg.includes("Too Many Requests");
            const isServerErr = msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("timeout");

            if (isRateLimit) {
                stats.rateLimitErrors++;
                // 429? Wait longer. 5s, 10s, 15s
                const wait = attempt * 5000;
                console.warn(`⚠️  [429] Rate Limit. Waiting ${wait}ms...`);
                await sleep(wait);
            } else if (isServerErr) {
                stats.serverErrors++;
                const wait = attempt * 2000;
                console.warn(`⚠️  [5xx] Server Error. Waiting ${wait}ms...`);
                await sleep(wait);
            } else {
                // Other errors (e.g. malformed JSON)
                console.warn(`⚠️  Enrichment error: ${msg}. Retrying in 1s...`);
                await sleep(1000);
            }

            if (attempt >= maxRetries) throw err;
        }
    }
}

// Allow running directly via `node src/pipelines/enrich_and_store.mjs`
// Allow running directly via `node src/pipelines/enrich_and_store.mjs`
import { pathToFileURL } from "url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runPipeline().catch((e) => {
        console.error("Pipeline crashed:", e);
        process.exit(1);
    });
}
