---
title: Debugging in the browser
description: How to debug in the browser with Glean.js.
---

All the available [debugging options](/debugging/options) are available in the browser. You can
enable these options using the `window.Glean` object.

The debugging preferences are set in the browser's `sessionStorage`. Once set
these options will persist until you end your current browser session.

## Usage

```js
// Log pings to the browser console.
window.Glean.setLogPings(true);

// Tag pings so that they show up in the Glean Debug Ping Viewer.
window.Glean.setDebugViewTag("example-tag");

// Tag pings with source tags.
window.Glean.setSourceTags(["my-tag", "your-tag", "our-tag"]);
```

## Try it out
The documentation you are currently using is instrumented with
Glean.js (cool right?).

- Right click on this page
- Click on "Inspect"
- Click on "Console"
- Set a debugging option like `window.Glean.setLogPings(true)`
- Reload the page

## Further reading

- <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage" target="_blank">sessionStorage</a>
