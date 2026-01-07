# LLM Provider Contract (Vendor-Neutral)

## Purpose

Lead Watcher uses an LLM to convert messy, real-world text (articles, press releases, tweets, RSS snippets) into **structured decisions** (lead vs not, scores, reasons, extracted entities, outreach drafts).

This document defines a **provider-neutral contract** so we can swap LLM vendors (OpenAI, DeepSeek, etc.) without rewriting the application.

**Design goal:** The rest of the system must not care which LLM provider is used.
It should only care that it gets valid, schema-compliant JSON back.

---

## Core Principles

1. **One interface, many providers**
   - All LLM usage goes through a single adapter module (ex: `src/llm/client.py`).
   - No other code calls vendor SDKs directly.

2. **Structured outputs always**
   - LLM responses must be valid JSON matching a predefined schema.
   - No prose, no markdown, no “Here’s what I found”.

3. **Deterministic behavior**
   - Use low creativity settings:
     - `temperature = 0`
     - `top_p = 1` (or vendor equivalent)
   - We want repeatable decisions, not creative writing.

4. **Trust boundaries**
   - The LLM is not a source of truth.
   - It classifies/extracts from *provided text* only.
   - The system stores evidence (snippets + URLs) so humans can verify.

5. **Validation + retry**
   - Every response is validated against schema.
   - If invalid, retry with stricter instructions.
   - If still invalid, fail gracefully and log.

---

## Contract: Required Capabilities

A provider integration must support:

- Chat completion style call (system + user messages)
- Output length control (max tokens / max output)
- Low-temperature deterministic mode
- JSON output capability (native or prompt-enforced)
- Reasonably consistent adherence to “JSON only” constraints
- Latency acceptable for near-real-time alerts (target: seconds, not minutes)

---

## Provider-Agnostic API Shape

### Function Signature (Logical)

`generate_structured(task_name, input_text, schema, context) -> dict`

Where:

- `task_name`: identifies the pipeline step (e.g., `lead_classification`, `entity_extract`)
- `input_text`: the raw content to analyze (article text, snippet, etc.)
- `schema`: JSON schema (or schema-like contract) the model must follow
- `context`: optional extra info (source URL, prior results, constraints)

**Returns:** a Python dict that validates against the schema.

---

## Standard Prompt Format

### System Message (Template)

Use a consistent system prompt across providers:

- You are an information extraction engine.
- You must output valid JSON only.
- You must not invent facts.
- If uncertain, say so via fields in the schema.

Example:

"You are a strict JSON generator. Output only valid JSON matching the provided schema. Do not include any extra keys. Do not include markdown. Use only information from the provided text."

### User Message (Template)

Include:

1. Task instructions (short)
2. The schema
3. The input text

Example structure:

- Task: classify if this is a Series A/B funding lead
- Output: JSON only
- Schema: { ... }
- Text: { ... }

---

## Output Rules (Hard Requirements)

All providers must obey:

1. **JSON only**
   - Response must start with `{` and end with `}`.
   - No leading/trailing text.
   - No markdown code fences.

2. **Schema compliance**
   - All required keys present
   - Types correct
   - No extra keys unless schema allows
   - Enums respected (if used)

3. **No hallucinated evidence**
   - Any extracted claims must be supported by the input text.
   - If information is missing, fill nullable fields or use explicit “unknown” values.

4. **Stable formatting**
   - No trailing commas
   - No NaN/Infinity
   - Strings must be properly escaped

---

## Canonical Tasks and Schemas

### 1) Lead Classification

**Goal:** Decide if the content represents a relevant recruiting lead (Series A/B funding signal).

Minimum output fields:

- `is_lead` (boolean)
- `confidence` (0..1 float)
- `lead_type` (enum: `funding_series_a`, `funding_series_b`, `other`, `not_a_lead`)
- `company_name` (string | null)
- `evidence` (array of short quotes/snippets from the text)
- `reason` (short, plain-English string)

### 2) Entity Extraction

**Goal:** Extract structured entities for enrichment.

Minimum output fields:

- `company_name`
- `website` (nullable)
- `location` (nullable)
- `signals` (array: funding amount, round, investors, date if present)
- `people` (optional array of names/roles if present in text)

### 3) Outreach Draft

**Goal:** Produce a ready-to-send recruiter outreach message.

Minimum output fields:

- `subject_line`
- `email_body`
- `personalization_hooks` (array of short hooks tied to evidence)

**Constraint:** Must remain compliant with “public signals only”.
No private data, no LinkedIn scraping assumptions.

---

## Validation & Retry Strategy

### Step 1: Parse JSON
- Attempt strict JSON parse.
- If fail: retry once with explicit “Return valid JSON only” reinforcement.

### Step 2: Validate schema
- Validate types and required keys.
- If fail: retry with:
  - “Do not add extra keys”
  - “Fix only formatting/types; keep content the same”

### Step 3: Fallback behavior
If still invalid after retries:
- Return a safe failure object (internal)
- Log the raw response + error
- Do NOT send notifications from malformed outputs

---

## Provider Configuration Requirements

Store these in `.env` (or equivalent config):

- `LLM_PROVIDER` (e.g., `openai`, `deepseek`)
- `LLM_MODEL`
- `LLM_API_KEY`
- Optional:
  - `LLM_BASE_URL`
  - `LLM_TIMEOUT_SECONDS`
  - `LLM_MAX_TOKENS`
  - `LLM_RETRY_COUNT`

---

## Observability Requirements

Every LLM call must log:

- task_name
- provider/model
- input size (chars or tokens estimate)
- response size
- duration
- validation outcome (pass/fail)
- retry count

**Do not log**:
- API keys
- sensitive user data (this project should avoid it anyway)

---

## Security & Privacy Constraints

- Only public content is processed.
- No scraping of private data sources (e.g., LinkedIn).
- No storage of sensitive personal data.
- Keep raw source text and evidence snippets for auditability.

---

## Vendor-Specific Notes

### OpenAI
- Can use native structured output mechanisms (when available).
- Still must validate output (do not trust blindly).

### DeepSeek
- Typically uses prompt-enforced JSON formatting.
- Requires stricter “JSON only” wording.
- Validation + retry is especially important.

---

## Definition of Done (Provider Integration)

A provider integration is considered complete when:

- All canonical tasks produce valid JSON outputs
- Outputs validate against schema ≥ 99% over test corpus
- Retries work and failure modes are safe
- Switching providers requires only config changes, not code rewrites
