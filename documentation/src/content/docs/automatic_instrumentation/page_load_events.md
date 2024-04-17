---
title: Page Load Events
description: How to use Glean.js automatic page loads.
---


Glean can automatically collect an event on each page load. The default
values that are captured are:

- url: `window.location.href`
- referrer: `document.referrer`
- title: `document.title`

## Automatic Page Load Events

You can turn on automatic page load events by adding a value in the Glean
initialize configuration.

```js
import Glean from '@mozilla/glean/web';

Glean.initialize("app-name", true, {
  ...,
  enableAutoPageLoadEvents: true,
});
```

## Manual Page Load Events w/ Overrides

When to use the `GleanMetrics.pageLoad` API

1. You are using an SPA framework that doesn't reload pages on navigation.
2. You want to trigger page loads with custom data overrides.

```js
import GleanMetrics from '@mozilla/glean/metrics';

// Call the page load event manually with the default values.
GleanMetrics.pageLoad();

// Call the pageLoad event with overrides.
GleanMetrics.pageLoad({
  // You can optionally include any or all of these values.
  referrer: someCustomReferrer,
  url: someCustomUrl,
  title: someCustomTitle
});
```
