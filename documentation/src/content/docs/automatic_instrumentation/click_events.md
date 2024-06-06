---
title: Click events
description: How to use Glean.js automatic clicks.
---

## Automatic click events

You can turn on automatic click events by adding a value in the `Glean.initialize` configuration object.

```js
import Glean from '@mozilla/glean/web';

Glean.initialize("app-name", true, {
  ...,
  enableAutoElementClickEvents: true,
});
```

Glean.js will create a global click listener to catch all clicks for
elements that include one of the following data attributes:

- `data-glean-id`
- `data-glean-label`
- `data-glean-type`

An example HTML button that will fire a click event:

```html
<button
  onclick="someAction()"
  data-glean-id="some-id"
  data-glean-label="some-label"
  data-glean-type="some-type"
>
  Click me to record an event
</button>
```

## Click event API

Glean.js provides an API for manually collecting click events.

When to use the `GleanMetrics.recordElementClick` API

1. You want to trigger click events with dynamic custom data overrides.
2. You have an existing handler used across multiple UI elements and you do not want to give every single element new HTML attributes.

### Usage

```js
import GleanMetrics from '@mozilla/glean/metrics';

// Call the click event manually with no extra values.
GleanMetrics.recordElementClick();

// Call the click event with extra values.
GleanMetrics.recordElementClick({
  // You can optionally include any or all of these properties.
  id: someId,
  type: someType,
  label: someLabel
});
```

## Try it out

To see automatic click events in action, check out our [interactive playground](../playground).
