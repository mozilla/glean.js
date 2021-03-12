# Unreleased changes

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.4.0...main)

* [#96](https://github.com/mozilla/glean.js/pull/96): Provide a ping encryption plugin.
  * This plugin listens to the `afterPingCollection` event. It receives the collected payload of a ping and returns an encrypted version of it using a JWK provided upon instantiation.
* [#95](https://github.com/mozilla/glean.js/pull/95): Add a `plugins` property to the configuration options and create an event abstraction for triggering internal Glean events.
  * The only internal event triggered at this point is the `afterPingCollection` event, which is triggered after ping collection and logging, and before ping storing.
  * Plugins are built to listen to a specific Glean event. Each plugin must define an `action`, which is executed everytime the event they are listening to is triggered.
* [#101](https://github.com/mozilla/glean.js/pull/101): BUGFIX: Only validate Debug View Tag and Source Tags when they are present.
* [#101](https://github.com/mozilla/glean.js/pull/101): BUGFIX: Only validate Debug View Tag and Source Tags when they are present.
* [#102](https://github.com/mozilla/glean.js/pull/102): BUGFIX: Include a Glean User-Agent header in all pings.

# v0.4.0 (2021-03-10)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.3.0...v0.4.0)

* [#92](https://github.com/mozilla/glean.js/pull/92): Remove `web-ext-types` from `peerDependencies` list.
* [#98](https://github.com/mozilla/glean.js/pull/98): Add external APIs for setting the Debug View Tag and Source Tags.
* [#99](https://github.com/mozilla/glean.js/pull/99): BUGFIX: Add a default ping value in the testing APIs.

# v0.3.0 (2021-02-24)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.2.0...v0.3.0)

* [#90](https://github.com/mozilla/glean.js/pull/90): Provide exports for CommonJS and browser environemnts.
* [#90](https://github.com/mozilla/glean.js/pull/90): BUGIFX: Accept lifetimes as strings when instantiating metric types.
* [#90](https://github.com/mozilla/glean.js/pull/90): BUGFIX: Fix type declaration paths.
* [#90](https://github.com/mozilla/glean.js/pull/90): BUGFIX: Make web-ext-types a peer dependency.
  * This is quick fix until [Bug 1694701](https://bugzilla.mozilla.org/show_bug.cgi?id=1694701) is fixed.

# v0.2.0 (2021-02-23)

* [#85](https://github.com/mozilla/glean.js/pull/85): Include type declarations in `@mozilla/glean` webext package bundle.

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.1.1...v0.2.0)
# v0.1.1 (2021-02-17)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.1.0...v0.1.1)

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
