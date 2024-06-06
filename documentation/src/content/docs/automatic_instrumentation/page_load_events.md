---
title: Page load events
description: How to use Glean.js automatic page loads.
---


Glean can automatically collect an event on each page load. The default
values that are captured are:

- url: `window.location.href`
- referrer: `document.referrer`
- title: `document.title`

## Automatic page load events

You can turn on automatic page load events by adding a value in the Glean
initialize configuration.

```js
import Glean from '@mozilla/glean/web';

Glean.initialize("app-name", true, {
  ...,
  enableAutoPageLoadEvents: true,
});
```

## Page load event API

Glean.js provides an API for manually collecting page load events.

When to use the `GleanMetrics.pageLoad` API

1. You want to trigger page loads with custom data overrides.
2. You are using a framework that doesn't truly reload pages on navigation, like React.

### Usage

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

// Call the pageLoad event with a single override.
GleanMetrics.pageLoad({
  // If you do not provide an override, the default value will be recorded.
  // This overrides the `referrer` and still uses the default values for
  // both the `url` and the `title`.
  referrer: someCustomReferrer,
});
```

## Try it out

To see automatic page load events in action, check out our [interactive playground](../playground).
