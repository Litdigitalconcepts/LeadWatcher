Lead Watcher
What Lead Watcher Does

Lead Watcher is a lightweight system that monitors public signals of startup activity, especially Series A and Series B funding announcements, and turns those signals into timely, actionable alerts for recruiters.

Instead of manually checking news sites, blogs, or feeds and trying to decide whether something is relevant, Lead Watcher automates the boring part: it watches, filters, verifies, and notifies. The goal is simple. If a meaningful funding event happens, the right person hears about it quickly, with enough context to act.

No scraping. No private data. No guesswork masquerading as intelligence.

What Problem It Solves

Recruiters miss early signals because the information is scattered, noisy, and time-sensitive. Funding announcements appear in press releases, blogs, newsletters, and RSS feeds, but turning those raw signals into something useful requires repeated manual effort and judgment.

Lead Watcher solves this by:

Aggregating public signals from trusted sources

Scoring and filtering them for relevance

Deduplicating repeated or low-confidence events

Delivering clear, minimal notifications instead of noise

The result is fewer missed opportunities and less time wasted chasing false leads.

High-Level Flow

At a high level, Lead Watcher follows a simple pipeline:

Public sources such as RSS feeds and announcement blogs are monitored on a schedule. New items are ingested and analyzed to determine whether they represent a meaningful funding event. Relevant signals are scored, verified, and checked against prior alerts to prevent duplication. When a signal meets the criteria, the system generates a concise alert and delivers it via push notification.

Each step is intentionally modular so the system stays understandable, debuggable, and easy to extend without turning into an unmaintainable mess.

Where to Start

Start with:

/docs/blueprint_product.md


That document defines the scope, constraints, and goals of Lead Watcher. Everything else in the project exists to support what’s written there.

[TODO: Add setup instructions]
