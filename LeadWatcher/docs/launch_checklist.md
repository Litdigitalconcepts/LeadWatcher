#Ingestion
- [ ] At least 3 sources ingest successfully
- [ ] Failed fetches are logged, not silent
- [ ] One source intentionally broken to confirm error handling

# Dedupe + scoring checks
- [ ] Same article ingested twice does not create two items
- [ ] Same funding event across 2+ sources merges into one lead
- [ ] Lead score is non-zero only when required signals exist

# Database sanity checks
- [ ] Supabase tables exist and migrations applied
- [ ] Unique constraints prevent duplicate items
- [ ] Test lead can be inserted and queried

# Notifications
- [ ] At least one notification sent successfully
- [ ] Failed notifications are logged, not silent
- [ ] One notification intentionally broken to confirm error handling
- [ ] Notification fires for exactly one qualifying lead
- [ ] Duplicate lead does NOT resend notification
- [ ] Notification payload includes source link

#Config + secrets
- [ ] All secrets stored in environment variables
- [ ] Secrets not hardcoded in source code
- [ ] Secrets rotation process documented
- [ ] No API keys committed to git
- [ ] .env.example exists
- [ ] Missing env vars fail fast with clear error

#Human sanity check
- [ ] README explains what this does in plain English
- [ ] I can explain the flow without opening the code
- [ ] Turning the system off is one command
