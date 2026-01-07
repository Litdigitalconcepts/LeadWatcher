Lead Watcher – Engineering Blueprint (v1)
Purpose

This document translates the product intent from /docs/blueprint_product.md into a buildable system.

Lead Watcher v1 is a pipeline:

Ingestion → Normalization → Scoring → Dedupe → Storage → Notify

The system is designed to be:

modular (each part does one job)

explainable (logs show “why”)

quiet when uncertain (low confidence = no alert)

High-Level Flow (Ingestion → Scoring → Dedupe → Notify)
1) Ingestion

Goal: Pull new items from public sources on a schedule.

Inputs:

RSS feeds (primary)

optional: curated public webpages/newsletters if easily accessible (v1 can skip)

Output:

raw “items” (title, link, date, summary/snippet, source name)

Key behaviors:

run periodically (background task / cron)

fetch only new items (avoid reprocessing everything)

tolerate failures (a feed failing is not a system failure)

2) Normalization (aka “make everything look the same”)

Goal: Convert different source formats into a single internal schema.

Output becomes a NormalizedSignal record with fields like:

source_id (which feed/source)

source_name

published_at

title

url

summary

raw_text (best effort)

fetched_at

Why this exists:

RSS feeds vary wildly

You want downstream logic to operate on one shape

3) Scoring (classification + confidence)

Goal: Decide whether a signal is a valid “lead” (Series A/B) and how confident we are.

Scoring checks (rule-based first, LLM optional):

Does the text mention Series A or Series B explicitly?

Does it contain credible funding language (“raised”, “announced”, “led by”, etc.)?

Does it name investors or an amount?

Is the source credible?

Is the writing speculative (rumor language)?

Output:

candidate = true/false

stage = SeriesA / SeriesB / Unknown

confidence = 0.0–1.0

reasons[] (strings explaining decisions)

Important: If candidate=false OR confidence < threshold, do not proceed to notify.
Lead Watcher – Engineering Blueprint (v1)
Purpose

This document translates the product intent from /docs/blueprint_product.md into a buildable system.

Lead Watcher v1 is a pipeline:

Ingestion → Normalization → Scoring → Dedupe → Storage → Notify

The system is designed to be:

modular (each part does one job)

explainable (logs show “why”)

quiet when uncertain (low confidence = no alert)

High-Level Flow (Ingestion → Scoring → Dedupe → Notify)
1) Ingestion

Goal: Pull new items from public sources on a schedule.

Inputs:

RSS feeds (primary)

optional: curated public webpages/newsletters if easily accessible (v1 can skip)

Output:

raw “items” (title, link, date, summary/snippet, source name)

Key behaviors:

run periodically (background task / cron)

fetch only new items (avoid reprocessing everything)

tolerate failures (a feed failing is not a system failure)

2) Normalization (aka “make everything look the same”)

Goal: Convert different source formats into a single internal schema.

Output becomes a NormalizedSignal record with fields like:

source_id (which feed/source)

source_name

published_at

title

url

summary

raw_text (best effort)

fetched_at

Why this exists:

RSS feeds vary wildly

You want downstream logic to operate on one shape

3) Scoring (classification + confidence)

Goal: Decide whether a signal is a valid “lead” (Series A/B) and how confident we are.

Scoring checks (rule-based first, LLM optional):

Does the text mention Series A or Series B explicitly?

Does it contain credible funding language (“raised”, “announced”, “led by”, etc.)?

Does it name investors or an amount?

Is the source credible?

Is the writing speculative (rumor language)?

Output:

candidate = true/false

stage = SeriesA / SeriesB / Unknown

confidence = 0.0–1.0

reasons[] (strings explaining decisions)

Important: If candidate=false OR confidence < threshold, do not proceed to notify.

Analogy: This is airport security for bad leads. Overly strict is fine. Under-strict becomes spam.
4) Deduplication (don’t annoy the user)

Goal: Prevent multiple alerts for the same funding event.

Dedup strategy:

Create an event_fingerprint using stable attributes:

normalized company name (best effort)

stage

canonicalized URL (or title hash)

date window (published date bucket)

Check if an alert was already sent for the fingerprint (or “close enough” match)

Output:

is_duplicate = true/false

duplicate_of = alert_id (optional)

Rules:

If duplicate, store it but do not notify.

If it’s an update from a better source, optionally update confidence and metadata (v1 can skip updates and stay simple).

5) Storage (database as memory)

Goal: Persist signals, candidates, and alert history so the system learns what it already did.

Minimum tables/collections (conceptual):

sources (list of RSS feeds)

signals (everything ingested)

candidates (signals that passed scoring)

alerts (what user was notified about)

Must store:

alert history to enable dedupe

scoring reasons to debug

6) Notify (push alert)

Goal: Send one clear notification per validated event.

Notification payload (minimum):

company name

stage (A/B)

date

source link

confidence indicator (optional but helpful)

Rules:

notify only when candidate=true, confidence>=threshold, and is_duplicate=false

rate limit (avoid bursts)

Rough Data Flow (Pipeline View)
Data Objects

RawFeedItem

title, url, published_at, snippet, source

→ normalized into

NormalizedSignal

source_id, source_name, url, published_at, title, summary, raw_text, fetched_at

→ scored into

LeadCandidate

signal_id, company_name, stage, confidence, reasons[], extracted_fields

→ deduped into

AlertEvent

candidate_id, event_fingerprint, notified_at, notification_payload
Architecture Diagram (Text-Based)
System Diagram (Modules)
           +-------------------+
           |   Source List      |
           | (RSS feeds)        |
           +---------+---------+
                     |
                     v
           +-------------------+
           |  Ingestion        |
           | fetch + parse RSS |
           +---------+---------+
                     |
                     v
           +-------------------+
           | Normalization     |
           | unify schema      |
           +---------+---------+
                     |
                     v
           +-------------------+
           | Scoring           |
           | classify + score  |
           +---------+---------+
                     |
                     v
           +-------------------+
           | Dedupe            |
           | fingerprint match |
           +---------+---------+
                     |
              +------v------+
              | Storage     |
              | (Supabase)  |
              +------^------+
                     |
                     v
           +-------------------+
           | Notify            |
           | (Expo push)       |
           +-------------------+

Event Lifecycle Diagram
Ingested signal
   |
   v
Scored candidate?
   | no -> store + stop
   v yes
Confidence >= threshold?
   | no -> store + stop
   v yes
Duplicate?
   | yes -> store + stop
   v no
Send notification + store alert history

Implementation Notes (v1 Constraints)
Keep It Boring

Rule-based scoring first (fast + explainable)

Add LLM only if needed for:

extracting company name cleanly

generating a structured summary

Every module logs reasons for pass/fail

Failure Tolerance

If ingestion fails for one feed: skip it, keep going

If scoring fails for one item: store with error, continue

If notifications fail: store “failed_to_notify” and retry later

Scheduling

Use a predictable schedule (e.g., every 30–60 minutes)

Background execution:

mobile: Expo TaskManager (with platform constraints)

server: cron job (simpler, often better for v1)

(Engineering decision: if mobile background tasks feel fragile, run the pipeline server-side and let the app be a notification client.)

Key Config Values (v1)

CONFIDENCE_THRESHOLD (start strict: 0.75 or higher)

MAX_ALERTS_PER_DAY (cap for sanity)

DEDUP_WINDOW_DAYS (e.g., 7 days)

SOURCE_TIERS (primary vs secondary credibility)

Where to Start Building

Implement ingestion for 3–5 high-quality RSS feeds

Normalize signals into a single schema and store them

Add scoring rules and log reasons

Add dedupe with fingerprinting

Wire notifications only after the above is stable

If you build notifications first, you’ll just spam yourself faster. Humans love doing that.