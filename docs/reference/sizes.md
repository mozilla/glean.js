# Estimated bundle sizes

The size of the Glean.js bundle varies depending on the metric types and plugins being used.

## Minimum bundle

The minimum bundle is the Glean.js bundle without any user defined metric types or custom pings.

To check out a comprehensive list of which metrics are collected by Glean and their types check out
["Metrics collected by Glean.js"](https://github.com/mozilla/glean.js/blob/main/docs/reference/metrics.md).

<!-- ! -->
|| Size |
|--|--|
|web|**53 KB**|
|webext|**53 KB**|
|node|**52 KB**|
|QML|**69 KB**|
<!-- ! -->

> **Note**: The QML bundle contains all the metric types and is not distributed through the
> `@mozilla/glean` package, but instead through the releases page on this repository.

## Additional metric types

Every metric type imported will make the size of the Glean.js bundle larger.

Even importing metric types that are also used by Glean internally will slightly increase
the size of the bundle due to auxiliary code necessary to export the metric types code
to external consumers.

<!-- ! -->
|Metric Type| web|webext|node|
|--|--|--|--|
|boolean|527 bytes |527 bytes |527 bytes |
|labeled|385 bytes |361 bytes |360 bytes |
|quantity|784 bytes |772 bytes |771 bytes |
|text|574 bytes |574 bytes |574 bytes |
|timespan|2.4 KB |2.4 KB |2.4 KB |
|rate|1.6 KB |1.6 KB |1.6 KB |
|url|1.0 KB |1.0 KB |1.0 KB |
<!-- ! -->

## Plugins

Plugins add extra functionality to Glean.
Using a plugin also means a size impact on the final bundle.

<!-- ! -->
|Plugin| web|webext|node|
|--|--|--|--|
|encryption|22 KB |22 KB |28 KB |
<!-- ! -->
