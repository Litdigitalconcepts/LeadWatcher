// LeadWatcher/src/enrichment/openrouter_client.mjs
import "dotenv/config";

/**
 * OpenRouter client
 * Routes requests to DeepSeek (cheaper) through OpenRouter (simpler).
 */
export async function OpenRouterChat({
  messages,
  model = "deepseek/deepseek-chat",
  responseFormat = "json_object",
  maxTokens = 200,
  temperature = 0.2,
} = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Add it to your .env file and rerun."
    );
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    response_format: { type: responseFormat },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost",
      "X-Title": "Lead Watcher",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter API error: ${res.status} ${res.statusText}\n${text}`
    );
  }

  return res.json();
}
