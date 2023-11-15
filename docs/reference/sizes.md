# Estimated bundle sizes

The size of the Glean.js bundle varies depending on the metric types and plugins being used.

## Minimum bundle

The minimum bundle is the Glean.js bundle without any user defined metric types or custom pings.

To check out a comprehensive list of which metrics are collected by Glean and their types check out
["Metrics collected by Glean.js"](https://github.com/mozilla/glean.js/blob/main/docs/reference/metrics.md).

<!-- ! -->
|| Size |
|--|--|
|web|**61 KB**|
<!-- ! -->

> **Note**: The QML bundle contains all the metric types and is not distributed through the
> `@mozilla/glean` package, but instead through the releases page on this repository.

## Additional metric types

Every metric type imported will make the size of the Glean.js bundle larger.

Even importing metric types that are also used by Glean internally will slightly increase
the size of the bundle due to auxiliary code necessary to export the metric types code
to external consumers.

<!-- ! -->
|Metric Type| web|
|--|--|
|boolean|1.8 KB |
|counter|998 bytes |
|custom_distribution|5.8 KB |
|datetime|1.1 KB |
|event|1008 bytes |
|labeled|355 bytes |
|memory_distribution|6.1 KB |
|quantity|2.1 KB |
|string|998 bytes |
|text|1.8 KB |
|timespan|5.3 KB |
|timing_distribution|8.7 KB |
|rate|2.5 KB |
|uuid|1.0 KB |
|url|2.3 KB |
<!-- ! -->

## Plugins

Plugins add extra functionality to Glean.
Using a plugin also means a size impact on the final bundle.

<!-- ! -->
|Plugin| web|
|--|--|
|encryption|22 KB |
<!-- ! -->
