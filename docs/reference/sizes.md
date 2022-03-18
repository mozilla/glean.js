# Estimated bundle sizes

The size of the Glean.js bundle varies depending on the metric types and plugins being used.

## Minimum bundle

The minimum bundle is the Glean.js bundle without any user defined metric types or custom pings.

To check out a comprehensive list of which metrics are collected by Glean and their types check out
["Metrics collected by Glean.js"](https://github.com/mozilla/glean.js/blob/main/docs/reference/metrics.md).

<!-- ! -->
|| Size |
|--|--|
|web|**56 KB**|
|webext|**55 KB**|
|node|**55 KB**|
|QML|**78 KB**|
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
|boolean|1.6 KB |1.6 KB |1.6 KB |
|counter|998 bytes |998 bytes |998 bytes |
|datetime|1.1 KB |1.1 KB |1.1 KB |
|event|1008 bytes |1008 bytes |1008 bytes |
|labeled|361 bytes |385 bytes |361 bytes |
|quantity|1.7 KB |1.7 KB |1.7 KB |
|string|998 bytes |998 bytes |998 bytes |
|text|1.5 KB |1.5 KB |1.5 KB |
|timespan|3.9 KB |3.9 KB |3.9 KB |
|rate|2.3 KB |2.3 KB |2.3 KB |
|uuid|1.0 KB |1.0 KB |1.0 KB |
|url|2.0 KB |2.0 KB |2.0 KB |
<!-- ! -->

## Plugins

Plugins add extra functionality to Glean.
Using a plugin also means a size impact on the final bundle.

<!-- ! -->
|Plugin| web|webext|node|
|--|--|--|--|
|encryption|21 KB |21 KB |28 KB |
<!-- ! -->
