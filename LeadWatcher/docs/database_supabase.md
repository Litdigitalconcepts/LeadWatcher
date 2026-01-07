# Supabase Database Design (Lead Watcher)

## Purpose
Supabase (Postgres) is Lead Watcher’s system of record. It stores: (1) raw ingested items from sources, (2) extracted signals, (3) deduped/scored leads, and (4) notifications sent. The goal is to prevent duplicate alerts, enable re-scoring, and preserve evidence for why a lead was generated.

## Core Entities

### sources
Tracks where we ingest from (RSS feeds, press pages, blogs).
- id (uuid, pk)
- name
- type (rss | website | other)
- url
- enabled (bool)
- created_at

### items (raw ingestion)
One row per fetched article/post.
- id (uuid, pk)
- source_id (fk -> sources.id)
- title
- url (unique)
- published_at
- content_text
- content_hash (used for dedupe)
- fetched_at

### signals (extracted clues)
Structured claims extracted from items (funding round, amount, investors, etc).
- id (uuid, pk)
- item_id (fk -> items.id)
- signal_type (funding_round | amount | investor | hiring | other)
- value (text or json)
- confidence (0..1)
- created_at

### leads (deduped opportunities)
Canonical record representing a single opportunity worth notifying about.
- id (uuid, pk)
- company_name
- company_domain (optional)
- funding_round (A | B | other)
- amount (optional)
- event_date
- lead_score
- status (new | notified | dismissed)
- primary_item_id (fk -> items.id)
- created_at

### lead_items (evidence join)
Links multiple items to one lead.
- lead_id (fk -> leads.id)
- item_id (fk -> items.id)
(lead_id, item_id) unique

### notifications (audit + anti-spam)
Tracks what we sent and prevents duplicates.
- id (uuid, pk)
- lead_id (fk -> leads.id)
- channel (email | push | sms)
- recipient (text)
- dedupe_key (unique)
- sent_at
- status (sent | failed)
- error (optional)

## Dedupe Rules

### Item dedupe
Primary: items.url is unique.
Fallback: if URL differs but content is identical, compare content_hash.

### Lead dedupe (high level)
A lead is considered the same if company_name (normalized) + funding_round match within an event_date window (e.g., 7–14 days), then merge evidence via lead_items.

### Notification dedupe
notifications.dedupe_key must be unique (e.g., `${lead_id}:${channel}:${recipient}`).
This prevents sending the same alert repeatedly.

## Setup (local/dev)
- Store Supabase connection info in `.env` (server-side only).
- Run migrations/SQL to create tables.
- Smoke test: insert a source, insert an item, read it back.
