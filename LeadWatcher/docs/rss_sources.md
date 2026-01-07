# RSS Sources (Lead Watcher)

This file is the *input buffet* for Lead Watcher’s ingestion layer.

Goal: detect credible “new funding happened” signals fast, with enough context to score + dedupe them.

## How to use this file
- Start with the **Tier 1** feeds (high signal, lower noise).
- Add **Tier 2** for broader coverage once scoring/dedupe works.
- Use **Tier 3** only if you want “maximum recall” and you’re okay filtering a lot.

---

## Tier 1 (Start here: reliable signal for startup funding)

### Crunchbase News (private markets + rounds coverage)
- https://news.crunchbase.com/feed

Why it’s useful:
- They explicitly report rounds and label them clearly.

---

### TechCrunch (startup + venture coverage)
- Main feed (broad): https://techcrunch.com/feed/
- Funding-ish coverage (tag feed pattern commonly works): https://techcrunch.com/tag/funding/feed/
- Fundraising topic coverage (alternative tag): https://techcrunch.com/tag/fundraising/feed/

Why it’s useful:
- Fast reporting, usually includes round size + investors.
What to watch:
- Not everything is Series A/B. Score using stage keywords + round size.

---

### VentureBeat (tech business news; sometimes funding)
- https://venturebeat.com/feed/

Why it’s useful:
- Good for enterprise/AI funding stories that don’t always hit VC-only outlets.

---

### Tech.eu (EU funding summaries + weekly roundups)
- https://tech.eu/feed/

Why it’s useful:
- Great EU coverage and “roundup” posts that list multiple deals.
What to watch:
- Roundups can trigger multiple “leads” from one article. Your parser should split them.

---

## Tier 2 (Press wires: lots of funding announcements, lots of spam)

Press wires are like listening to everyone at a mall food court.
You’ll hear real things, but also a lot of nonsense. Scoring + trust filters are mandatory.

### PR Newswire (all releases)
- https://www.prnewswire.com/rss/all-news-releases-from-PR-newswire-news.rss

Why it’s useful:
- Some startups announce rounds here.
What to watch:
- Massive volume + marketing fluff. Only trust if it clearly states financing + investors, or you can cross-confirm elsewhere.

---

### GlobeNewswire (choose categories)
Pick a targeted “financing” or “press releases” feed instead of the firehose.

- Financing Agreements:
  https://www.globenewswire.com/RssFeed/subjectcode/17-Financing%20Agreements/feedTitle/GlobeNewswire%20-%20Financing%20Agreements
- Press Releases (broad):
  https://www.globenewswire.com/RssFeed/subjectcode/72-Press%20Releases/feedTitle/GlobeNewswire%20-%20Press%20Releases
- RSS feed directory (browse categories):
  https://www.globenewswire.com/rss/list

Why it’s useful:
- Sometimes the only “official” source for a raise is a wire.
What to watch:
- A lot of “funding” is debt facilities, refinancing, grants, crypto treasury stuff, etc.
  Your “what does NOT count as a lead” rules matter here.

---

### Business Wire (subject page; may require HTML parsing if you don’t find a clean RSS)
- Funding subject page:
  https://www.businesswire.com/newsroom/subject/funding

Why it’s useful:
- Legit funding announcements appear here.
What to watch:
- If you can’t rely on RSS, treat as “press site HTML source” and parse headlines + links.

---

### PR.com (industry press release feeds)
- RSS directory:
  https://www.pr.com/rss-feeds

Why it’s useful:
- Easy to narrow by industry.
What to watch:
- Smaller companies + lots of low-signal releases. Use strict scoring.

---

## Tier 3 (Nice-to-have expansion: blogs + orgs + “context feeds”)

These won’t always announce rounds first, but they can improve scoring context
(trends, sectors, investors, market chatter).

### NVCA (industry org blog; more policy/industry than deal alerts)
- https://nvca.org/blog/

Why it’s useful:
- Good context, not great for “new round happened” alerts.

---

### Send2Press (press wire alternative)
- https://www.send2press.com/wire/feed/

Why it’s useful:
- Occasionally useful if you’re watching certain niches.
What to watch:
- Similar noise profile to other wires.

---

### StrictlyVC (podcast feed; context, not alerts)
- https://feeds.megaphone.fm/YFL5140015188

Why it’s useful:
- Helps you understand the VC conversation.
What to watch:
- Not a lead source. It’s a “background signal.”

---

## Notes for ingestion + scoring

### Recommended “minimum set” for a working MVP
Use these first:
- Crunchbase News
- TechCrunch (main feed + tag feed)
- VentureBeat
- Tech.eu

Then add:
- PR Newswire + GlobeNewswire (only after scoring/dedupe is stable)

### Common failure modes
- **Roundups**: one article contains 5–50 deals. Parser must extract multiple candidates.
- **Wires**: “funding” includes debt, refinancing, grants, partnerships, token treasuries.
- **Duplicate coverage**: the same round appears in 3 sources within 24 hours.
- **Non-startups**: public companies, SPACs, ETFs, “investment platform raises fund” (not a startup round).

### Practical tip
Store every ingested item with:
- source_name
- source_type (rss / html / wire)
- canonical_url
- title
- published_at
- extracted_entities (company, amount, stage, investors)
- raw_text_snippet (for audit/debug)
