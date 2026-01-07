Expo TaskManager / Background Work
What do I use this for?

Run periodic checks when the app is not actively open (poll for new signals, refresh state). This is the “autopilot” feature.

Minimum Setup

Use Expo TaskManager to define a background task.

Register the task with a schedule (where supported).

In the task: call a backend endpoint like /sync to fetch any new alerts.

What breaks if I misuse it?

Assuming background tasks are reliable on mobile: They aren’t. OSes limit background execution aggressively.

Doing heavy work on-device: battery drain, OS throttling, unreliable execution.

Too frequent schedules: task won’t run as expected, or the OS penalizes your app.

Common Failure Modes

Task doesn’t run due to OS restrictions

App must be opened at least once after install before tasks register

iOS background execution rules are strict; Android varies by manufacturer

Network calls fail in background more often than you’d expect

v1 Recommendation (brutally practical)

Use background tasks only for:

“check for missed notifications”

“refresh display state”

Do not do ingestion/scoring on-device if you can avoid it. Prefer:

backend does the pipeline

mobile is just the client receiving notifications