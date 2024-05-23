---
title: Sessions
description: How sessions work in Glean.js
---

## Definition

A session is the period of time in which a user interacts with the application.
After a period of inactivity (default being 30 minutes) a new session will be
created the next time the user interacts with the application.

The default session duration is **30 minutes**. You can override
this using the `sessionLengthInMinutesOverride` property when
calling `Glean.initialize()`.

### Session Duration

This specifies how long a session lasts before refreshing. The session
is checked for inactivity every time Glean performs a read/write/delete
to localStorage. You can find the session info in each ping:
`client_info.session_id` and `client_info.session_count`.

## Metrics

### session_id

The session ID is a UUID generated for every new session.

This is recorded in the `client_info.session_id` metric.

### session_count

A running counter of the number of unique sessions for the client. This value
is incremented each time a session expires due to inactivity.

This is recorded in the `client_info.session_count` metric.

## Overriding Session Length

```js
import Glean from '@mozilla/glean/web';

Glean.initialize("app-name", true, {
  ...,
  // Custom session timeout duration in MINUTES.
  sessionLengthInMinutesOverride: 15,
});
```

## Further reading

- <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage" target="_blank">localStorage</a>
