# Unreleased changes

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.1.0...main)

* [#77](https://github.com/mozilla/glean.js/pull/77): Include README.md file in `@mozilla/glean` package bundle.

# v0.1.0 (2021-02-17)

[Full changelog](https://github.com/mozilla/glean.js/compare/46f028fb4ea7b8f312daf4666904c81d0a3eb171...v0.1.0)

* [#73](https://github.com/mozilla/glean.js/pull/73): Add this changelog file.
* [#42](https://github.com/mozilla/glean.js/pull/42): Implement the `deletion-request` ping.
* [#41](https://github.com/mozilla/glean.js/pull/41): Implement the `logPings` debug tool.
  * When `logPings` is enabled, pings are logged upon collection.
* [#40](https://github.com/mozilla/glean.js/pull/40): Use the dispatcher in all Glean external API functions. Namely:
  * Metric recording functions;
  * Ping submission;
  * `initialize` and `setUploadEnabled`.
* [#36](https://github.com/mozilla/glean.js/pull/36): Implement the event metric type.
* [#31](https://github.com/mozilla/glean.js/pull/31): Implement a task Dispatcher to help in executing Promises in a deterministic order.
* [#26](https://github.com/mozilla/glean.js/pull/26): Implement the setUploadEnable API.
* [#25](https://github.com/mozilla/glean.js/pull/25): Implement an adapter that leverages browser APIs to upload pings.
* [#24](https://github.com/mozilla/glean.js/pull/24): Implement a ping upload manager.
* [#23](https://github.com/mozilla/glean.js/pull/23): Implement the initialize API and glean internal metrics.
* [#22](https://github.com/mozilla/glean.js/pull/22): Implement the PingType structure and a ping maker.
* [#20](https://github.com/mozilla/glean.js/pull/20): Implement the datetime metric type.
* [#17](https://github.com/mozilla/glean.js/pull/17): Implement the UUID metric type.
* [#14](https://github.com/mozilla/glean.js/pull/14): Implement the counter metric type.
* [#13](https://github.com/mozilla/glean.js/pull/13): Implement the string metric type.
* [#11](https://github.com/mozilla/glean.js/pull/11): Implement the boolean metric type.
* [#9](https://github.com/mozilla/glean.js/pull/9): Implement a metrics database module.
* [#8](https://github.com/mozilla/glean.js/pull/8): Implement a web extension version of the underlying storage module.
* [#6](https://github.com/mozilla/glean.js/pull/6): Implement an abstract underlying storage module.
