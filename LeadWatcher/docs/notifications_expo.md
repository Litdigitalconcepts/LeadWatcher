Expo Notifications (Push)
What do I use this for?

Send push notifications to the user when Lead Watcher detects a valid funding event (Series A/B). This is the “tap on the shoulder” part of the system.

Minimum Setup (bare minimum that works)

Install notifications package

Use Expo’s notifications module in your app (Expo managed workflow).

Request permission

On iOS, you must explicitly ask.

On Android, behavior depends on OS version (newer versions require runtime notification permission too).

Get an Expo push token

The app requests a token from Expo.

Store that token in your database linked to the user/device.

Send a test notification

Use Expo’s push service to send a message to that token.

Confirm it arrives on device.

Required Permissions (the “don’t skip this” part)

iOS: user permission prompt is mandatory.

Android: ensure notification permission is handled for newer Android versions.

If you forget permission logic, tokens might exist but notifications still won’t show.

Token Handling (how not to shoot yourself)

Treat push tokens like device addresses.

Store:

user_id

expo_push_token

platform (ios/android)

last_seen_at

Tokens can change. Re-register occasionally (e.g., on app launch).

What breaks if I misuse it?

No permission requested: Notifications silently don’t appear.

Token not stored or outdated: Messages fail or go nowhere.

Trying to send directly from the app: Wrong architecture. Your backend should send.

Too many notifications: user disables notifications and your product dies.

Common Failure Modes (aka “why isn’t it working”)

Running on a simulator (push often requires real device)

Notification permission denied

Token is null because the app never registered properly

Expo push service returns errors (invalid token, not registered)

iOS focus modes / notification settings blocking display

“Good Enough” v1 Rules

Send alerts only when confidence >= threshold and not a duplicate.

Rate limit: cap notifications/day.

Store every send attempt with status: sent, failed, suppressed