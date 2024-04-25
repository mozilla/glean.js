---
title: Debugging Options
description: How to debug Glean.js.
---

## Debug Tags

Tags all outgoing pings as debug pings to make them available for real-time validation, on the <a href="https://debug-ping-preview.firebaseapp.com/" target="_blank">Glean Debug Ping Viewer</a>.

The debug tag is used in the Glean Debug Ping Viewer so you can easily
find your pings. The Debug Tag is not included in the ping itself, rather
as a custom header in the network request; the header is `X-Debug-ID`.

All debug tags must match the regex `[a-zA-Z0-9-]{1,20}`. All other values are ignored.

```js
Glean.setDebugViewTag("example-tag");
```

## Log Pings

When enabled, pings will be logged to the browser console when sent.

```js
Glean.setLogPings(true);
```

## Source Tags

Tags outgoing pings with a maximum of 5 comma-separated tags. These are passed
along in the network request using the `X-Source-Tags` custom header. All values
must match the regex `[a-zA-Z0-9-]{1,20}`. If one of the values are invalid,
then all tags will be ignored.

```js
Glean.setSourceTags(["my-tag", "your-tag", "our-tag"]);
```

## Usage

These APIs can be called from anywhere in your code base; before or after Glean
is initialized. Be cautious of timing. If the debug option is not set until
after initialization, then something like a page load event may never show
up in the browser console or get sent to the Glean Debug Ping Viewer.

Example:

```js
import Glean from '@mozilla/glean/web';

if (appEnvironment.isDev) {
  Glean.setLogPings(true);
  Glean.setDebugViewTag("my-tag");
  Glean.setSourceTags(["my-tag", "your-tag", "our-tag"]);
}

Glean.initialize("my-app", true, {
  // Configuration options
});
```
