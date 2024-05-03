---
title: Setting up Glean.js
description: Set up Glean.js for your project.
---

## Initializing Glean.js

Glean.js must be initialized to collect data and send pings.

### `Glean.initialize`

```js
import Glean from '@mozilla/glean/web';

/**
 * Initialize Glean
 *
 * @param {string} appName Name of the application.
 * @param {boolean} uploadEnabled True if upload is enabled, false otherwise.
 * @param {Configuration} config Customizable configuration object for Glean.
 */
Glean.initialize("app-name", uploadEnabled, config);
```

### `Configuration` object

Glean.js-specific configuration options:

- `enableAutoPageLoadEvents`: Enables [automatic page load](/automatic_instrumentation/page_load_events) events.
- `enableAutoElementClickEvents`: Enables [automatic click](/automatic_instrumentation/click_events) events.
- `sessionLengthInMinutesOverride`: Overrides the default [session](/reference/sessions) length of 30 minutes.
- `experimentationId`: Experimentation identifier to be set in all pings.

<a href="https://mozilla.github.io/glean/book/reference/general/initializing.html#configuration" target="_blank">Full list of configuration options</a>

## When to initialize

Glean.js should be initialized **as soon as possible at the start of the application**. You should set all debugging options prior to `Glean.initialize`.

[Example initialization](/debugging/options#usage)
