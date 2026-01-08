// LeadWatchersrc/enrichment/analyze_lead.mjs
import { OpenRouterChat } from "./openrouter_client.mjs";

function coerceAmountToNumber(amountRaw) {
    if (amountRaw == null) return null;

    const s = String(amountRaw).trim().toUpperCase();

    // Digits only -> number
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

    // Remove currency symbols/commas: $40,000,000 -> 40000000
    const cleaned = s.replace(/[$€£,]/g, "");

    const m = cleaned.match(/(\d+(\.\d+)?)\s*(B|BILLION|M|MILLION|K|THOUSAND)?/);
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

function normalizeSentiment(sentimentRaw) {
    const s = String(sentimentRaw || "").trim().toLowerCase();
    if (["positive", "neutral", "negative"].includes(s)) return s;
    return "neutral";
}

function extractJsonObject(text) {
    if (!text) return null;

    // Remove ```json ... ``` fences
    const unfenced = text.replace(/```json|```/gi, "").trim();

    // Try direct parse first
    try {
        return JSON.parse(unfenced);
    } catch {
        // Intentionally empty - we'll try the fallback regex approach
    }

    // Fallback: grab the first {...} block
    const match = unfenced.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        return JSON.parse(match[0]);
    } catch {
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
                '  company (string), amount (string digits in USD, no symbols), sentiment ("positive"|"neutral"|"negative"), event_type (string).',
                "Rules:",
                "- If amount is unknown, set amount to null.",
                '- Sentiment should be positive for funding raises, neutral for factual announcements, negative for layoffs/shutdowns.',
                '- event_type must be one of: "funding", "acquisition", "partnership", "hiring", "product_launch", "other".',
                "- Do not include extra keys.",
            ].join("\n"),
        },
        {
            role: "user",
            content: `Headline: ${headline}\n\nExtract the JSON now.`,
        },
    ];

    // Call OpenRouter (OpenAI-compatible)
    // IMPORTANT: model must be an OpenRouter model slug, e.g. "deepseek/deepseek-chat"
    // If you set your openrouter_client.mjs default model, you can omit this.
    const data = await OpenRouterChat({
        messages,
        model: "deepseek/deepseek-chat",
        responseFormat: "json_object",
        maxTokens: 150,
        temperature: 0.1,
    });

    // OpenRouter returns OpenAI-style: choices[0].message.content
    const content = data?.choices?.[0]?.message?.content;
    console.log("\n===== RAW LLM OUTPUT START =====\n");
    console.log(content);
    console.log("\n===== RAW LLM OUTPUT END =====\n");
    if (!content) {
        throw new Error(
            `No content returned from OpenRouter. Raw response: ${JSON.stringify(data)}`
        );
    }

    const parsed = extractJsonObject(content);
    if (!parsed) {
        console.log("❌ Could not parse JSON from model output.");
        return null;
    }

    const funding_amount = coerceAmountToNumber(parsed.amount);
    console.log("FINAL funding_amount to insert:", funding_amount);

    return {
        company: parsed.company ?? null,
        amount: String(funding_amount ?? ""),
        funding_amount: funding_amount ?? null,
        sentiment: normalizeSentiment(parsed.sentiment),
        event_type: parsed.event_type || "other",
    };
}

// ---- "Small Win" test harness ----
import { pathToFileURL } from "url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const sampleHeadline = "Vercel raises $40M";

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
