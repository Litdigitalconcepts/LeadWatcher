Lead Watcher – Risk Register (v1)
Purpose

This document identifies the primary risks to Lead Watcher’s usefulness and trustworthiness, along with the mitigation strategies built into v1.

The guiding principle is simple:

A quiet system that misses one event is better than a noisy system that annoys the user.

Risk 1: Duplicate Alerts
Description

The same funding event appears multiple times across different sources (press release, blog repost, news article), resulting in repeated notifications for the same event.

Why This Is Dangerous

Repeated alerts feel spammy

Users quickly stop trusting the system

Notifications get ignored or disabled

Example Scenarios

A startup posts an official announcement, followed by three tech blogs reposting it

The same RSS item is re-ingested after a feed refresh

Slight variations in company name cause mismatches

Mitigation Strategy

Generate an event_fingerprint using stable attributes:

normalized company name

funding stage

canonical URL or title hash

published date window

Store alert history and check fingerprints before notifying

Suppress alerts if a similar event was already notified within the dedupe window

Residual Risk

Low. Some edge cases may slip through, but suppression bias is intentional.

Risk 2: False Funding Signals
Description

Non-funding events are misclassified as Series A or B raises.

Why This Is Dangerous

Wastes the user’s time

Reduces credibility

Forces users to double-check every alert

Example Scenarios

“Startup X is planning to raise Series A”

“Startup X secured strategic backing”

Investor blog mentions portfolio company growth without funding

Job postings or growth announcements mistaken for funding

Mitigation Strategy

Require explicit funding language (“raised”, “closed”, “announced”)

Require stage clarity (Series A or B)

Penalize speculative language (“rumored”, “seeking”, “plans to”)

Weight source credibility heavily

Default to rejection when ambiguous

Residual Risk

Medium. Ambiguous language is unavoidable, but silence is preferred over false confidence.

Risk 3: Trust Erosion
Description

Users lose confidence in the system due to unclear logic, inconsistent alerts, or unexplained decisions.

Why This Is Dangerous

Once trust is lost, alerts are ignored

Users disengage silently

The system becomes background noise

Example Scenarios

Alerts arrive without clear justification

Alerts appear random or inconsistent

Users cannot tell why something triggered

Mitigation Strategy

Log and store “reasons” for scoring decisions

Include minimal context in notifications (stage, source)

Keep logic explainable and rule-based in v1

Avoid “black box” behavior

Residual Risk

Low. Explainability is prioritized over cleverness.

Risk 4: Notification Fatigue
Description

Users receive too many alerts in a short period of time, even if individual alerts are technically valid.

Why This Is Dangerous

Notifications get muted or disabled

The system becomes counterproductive

Users stop acting on alerts

Example Scenarios

Multiple funding events in one day

Bursts caused by feed backlog

Secondary sources triggering near-duplicates

Mitigation Strategy

Enforce MAX_ALERTS_PER_DAY

Prefer primary sources over secondary ones

Batch or suppress low-confidence alerts

Prioritize quality over completeness

Residual Risk

Medium. Volume spikes may still occur during busy funding cycles.

Risk 5: Source Quality Drift
Description

Initially reliable sources degrade in quality over time, leading to noisier signals.

Why This Is Dangerous

Gradual decline is harder to notice

Noise increases slowly

Users blame the system, not the source

Example Scenarios

A blog shifts from reporting news to speculation

RSS feed changes structure or content focus

Mitigation Strategy

Tag sources by credibility tier

Periodically review and prune sources

Allow source-specific confidence weighting

Residual Risk

Low. Manual review required occasionally.

Risk Acceptance Summary
Risk	Severity	Strategy
Duplicate alerts	High	Suppress
False funding signals	High	Conservative
Trust erosion	Critical	Explainability
Notification fatigue	High	Rate limiting
Source quality drift	Medium	Review
Design Bias (Intentional)

Lead Watcher v1 is intentionally biased toward:

False negatives over false positives

Silence over speculation

Explainability over cleverness