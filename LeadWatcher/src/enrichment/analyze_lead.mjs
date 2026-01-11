// LeadWatchersrc/enrichment/analyze_lead.mjs
import { OpenRouterChat } from "./openrouter_client.mjs";

function coerceAmountToNumber(amountRaw) {
    if (amountRaw == null || amountRaw === "") return null;

    // Remove whitespace and convert to string
    let s = String(amountRaw).trim().toUpperCase();

    // If it's already a clean number, return it
    if (/^\d+$/.test(s)) return Number(s);

    // Clean currency symbols and commas: "$10,000,000" -> "10000000"
    // Also handle possible LLM artifacts like "USD" or "APPROX"
    const cleaned = s.replace(/[$€£,]|USD|APPROX/gi, "").trim();

    // Match number followed by optional unit suffix
    const m = cleaned.match(/^(\d+(\.\d+)?)\s*(B|BILLION|M|MILLION|K|THOUSAND)?$/);
    if (!m) return null;

    const value = Number(m[1]);
    if (Number.isNaN(value)) return null;

    const unit = m[3];
    const mult =
        unit === "B" || unit === "BILLION" ? 1_000_000_000 :
            unit === "M" || unit === "MILLION" ? 1_000_000 :
                unit === "K" || unit === "THOUSAND" ? 1_000 :
                    1;

    return Math.round(value * mult);
}

/**
 * Validation guardrail: Reject suspiciously small amounts for funding events.
 * A "Series A" or similar venture round is rarely below $100k,
 * but seed/grants can be smaller. We'll set a soft floor at $10k.
 */
function validateFundingAmount(amount, eventType) {
    if (eventType !== "funding") return true;
    if (amount === null) return true;

    if (amount < 10000) {
        console.warn(`⚠️  Validation Alert: Suspiciously small funding amount extracted ($${amount}). Manual review suggested.`);
        return false;
    }
    return true;
}

function normalizeSentiment(sentimentRaw) {
    const s = String(sentimentRaw || "").trim().toLowerCase();
    if (["positive", "neutral", "negative"].includes(s)) return s;
    return "neutral";
}

function extractJsonObject(text) {
    if (!text) return null;

    // 1. Strip markdown code fences if present (Try: Attempt to parse the LLM response...)
    let jsonString = text.replace(/```json|```/gi, "").trim();

    // 2. Attempt direct parse
    try {
        return JSON.parse(jsonString);
    } catch (e1) {
        // 3. Catch: If parsing fails, try fallback or log error.
        // Fallback: search for first `{...}` block in case there's extra text
        const match = jsonString.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                // Fallback parse also failed
                console.error("Failed to parse JSON (fallback failed):", e2.message);
                console.error("Raw string that caused failure:", text);
                return null;
            }
        }

        // No JSON-like bracket structure found, or simple parse failed and no fallback possible
        console.error("Failed to parse JSON:", e1.message);
        console.error("Raw string that caused failure:", text);
        return null;
    }
}

export async function analyzeHeadline(headline) {
    const messages = [
        {
            role: "system",
            content: [
                "You extract structured lead data from startup funding headlines.",
                "Return ONLY valid JSON with exactly these keys:",
                '  company (string), amount (integer string, raw digits ONLY, e.g. "40000000"), sentiment ("positive"|"neutral"|"negative"), event_type (string).',
                "Rules for 'amount':",
                "- ALWAYS return the full numeric value as a string of digits.",
                '- EXAMPLE: "$40M" -> "40000000", "$10,000,000" -> "10000000", "£500k" -> "500000" .',
                "- If the exact amount is unknown, set amount to null.",
                "Rules for other fields:",
                '- Sentiment: positive for funding/acquisition, neutral for info, negative for layoffs.',
                '- event_type: "funding", "acquisition", "partnership", "hiring", "product_launch", "other".',
                "- Do not include any extra text or markdown outside the JSON object.",
            ].join("\n"),
        },
        {
            role: "user",
            content: `Headline: ${headline}\n\nExtract the JSON now.`,
        },
    ];

    // Call OpenRouter (OpenAI-compatible)
    const data = await OpenRouterChat({
        messages,
        model: "deepseek/deepseek-chat",
        responseFormat: "json_object",
        maxTokens: 150,
        temperature: 0.1,
    });

    console.log("\n===== DEBUG: RAW LLM RESPONSE START =====");
    console.log(JSON.stringify(data, null, 2));
    console.log("===== DEBUG: RAW LLM RESPONSE END =====\n");

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error(`No content returned from OpenRouter.`);
    }

    const parsed = extractJsonObject(content);
    if (!parsed) {
        console.log("❌ Could not parse JSON from model output.");
        return null;
    }

    const funding_amount = coerceAmountToNumber(parsed.amount);
    const event_type = parsed.event_type || "other";

    // Apply validation guardrail
    const isValid = validateFundingAmount(funding_amount, event_type);

    console.log("FINAL funding_amount to insert:", funding_amount, isValid ? "" : "(FLAGGED)");

    return {
        company: parsed.company ?? null,
        amount: String(funding_amount ?? ""),
        funding_amount: funding_amount ?? null,
        sentiment: normalizeSentiment(parsed.sentiment),
        event_type: event_type,
        is_valid_amount: isValid,
    };
}

// ---- "Small Win" test harness ----
import { pathToFileURL } from "url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const sampleHeadline = process.argv[2] || "Vercel raises $40M";

    analyzeHeadline(sampleHeadline)
        .then((result) => {
            console.log("Input headline:", sampleHeadline);
            console.log("Extracted JSON:");
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((err) => {
            console.error("Analyze failed:");
            console.error(err?.message || err);
            process.exitCode = 1;
        });
}
