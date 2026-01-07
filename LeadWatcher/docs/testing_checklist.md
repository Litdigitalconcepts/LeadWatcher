# Testing Checklist (Lead Watcher)

## Ingestion Failure Cases
- [ ] Source returns error
- [ ] Source times out
- [ ] Malformed content handled gracefully

## Duplicate Handling
- [ ] Same item ingested twice does not duplicate
- [ ] Same event across sources merges into one lead

## Scoring Logic
- [ ] Non-funding content scores zero
- [ ] Partial signals do not over-score

## Notifications
- [ ] One lead triggers one alert
- [ ] Restart does not resend alerts
- [ ] Failures are logged clearly

## Database Integrity
- [ ] Unique constraints enforced
- [ ] No orphaned records after deletes

## Recovery
- [ ] Safe shutdown mid-process
- [ ] Clean restart with existing data
# Testing Checklist (Lead Watcher)

## Ingestion Failure Cases
- [ ] Source returns error
- [ ] Source times out
- [ ] Malformed content handled gracefully

## Duplicate Handling
- [ ] Same item ingested twice does not duplicate
- [ ] Same event across sources merges into one lead

## Scoring Logic
- [ ] Non-funding content scores zero
- [ ] Partial signals do not over-score

## Notifications
- [ ] One lead triggers one alert
- [ ] Restart does not resend alerts
- [ ] Failures are logged clearly

## Database Integrity
- [ ] Unique constraints enforced
- [ ] No orphaned records after deletes

## Recovery
- [ ] Safe shutdown mid-process
- [ ] Clean restart with existing data
