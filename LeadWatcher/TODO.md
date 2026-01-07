Phase 1: Clarify Inputs and Boundaries

 Review and finalize /docs/blueprint_product.md

Confirm what counts as a valid lead

Explicitly list what does not count

Lock scope for v1 (no enrichment creep)

 Finalize trusted public signal sources

Review /docs/signals/rss_sources.md

Remove low-signal or unreliable feeds

Mark “primary” vs “secondary” sources

Phase 2: Define the Core Logic (No Code Yet)

 Define lead scoring rules

What qualifies as Series A vs Series B

Minimum confidence threshold

Required fields for a “real” alert

 Define deduplication rules

What makes two signals the same event

Time window for suppressing duplicates

How updates to the same event are handled

 Document edge cases in /docs/risk_register.md

Ambiguous announcements

Reposted press releases

Partial or speculative funding news

Phase 3: Skeleton Implementation

 Create ingestion stubs in /src/ingestion

RSS fetcher (no parsing sophistication yet)

Basic normalization of incoming items

 Create scoring stub in /src/scoring

Placeholder logic that returns a confidence score

Log why a signal passed or failed

 Create dedupe stub in /src/dedupe

Simple hash or key-based duplicate detection

Phase 4: Notifications and Storage

 Set up basic database schema

Leads table

Alerts history table

Dedupe tracking

 Implement notification proof-of-concept

Single test push notification via Expo

Confirm delivery and failure handling

Phase 5: Validation and Tightening

 Write basic test scenarios

Valid funding announcement

Duplicate announcement

Non-funding noise

 Run end-to-end dry run

Ingest → score → dedupe → notify

Confirm only one clean alert is sent

 Review output quality

Is the alert understandable?

Is it actionable?

Is it annoying?

Stop Conditions (Important)

If alerts feel spammy, pause and fix logic

If confidence rules are unclear, revisit product blueprint

If scope starts expanding, defer to v2

Definition of “Done” for v1

One user

One reliable alert type

Zero duplicate notifications

Clear, explainable logic