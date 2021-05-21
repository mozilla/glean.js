# Unreleased changes

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.14.0...main)

* [#342](https://github.com/mozilla/glean.js/pull/342): BUGFIX: Fix timespan payload representatin to match exactly the payload expected according to the Glean schema.
* [#343](https://github.com/mozilla/glean.js/pull/343): BUGFIX: Report the correct failure exit code when the Glean command line tool fails.

# v0.14.0 (2021-05-19)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.13.0...v0.14.0)

* [#313](https://github.com/mozilla/glean.js/pull/313): Send Glean.js version and platform information on X-Telemetry-Agent header instead of User-Agent header.

# v0.13.0 (2021-05-18)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.12.0...v0.13.0)

* [#313](https://github.com/mozilla/glean.js/pull/313): Implement error recording mechanism and error checking testing API.
* [#319](https://github.com/mozilla/glean.js/pull/319): BUGFIX: Do not allow recording floats with the quantity and counter metric types.

# v0.12.0 (2021-05-11)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.11.0...v0.12.0)

* [#279](https://github.com/mozilla/glean.js/pull/279): BUGFIX: Ensure only empty pings triggers logging of "empty ping" messages.
* [#288](https://github.com/mozilla/glean.js/pull/288): Support collecting `PlatformInfo` from `Qt` applications. Only OS name and locale are supported.
* [#281](https://github.com/mozilla/glean.js/pull/281): Add the QuantityMetricType.
* [#303](https://github.com/mozilla/glean.js/pull/303): Implement setRawNanos API for the TimespanMetricType.

# v0.11.0 (2021-05-03)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.10.2...v0.11.0)

* [#260](https://github.com/mozilla/glean.js/pull/260): Set minimum node (>= 12.0.0) and npm (>= 7.0.0) versions.
* [#202](https://github.com/mozilla/glean.js/pull/202): Add a testing API for the ping type.
* [#253](https://github.com/mozilla/glean.js/pull/253):
  * Implement the timespan metric type.
  * BUGFIX: Report event timestamps in milliseconds.
* [#261](https://github.com/mozilla/glean.js/pull/261): Show a spinner while setting up python virtual environment
* [#273](https://github.com/mozilla/glean.js/pull/273): BUGFIX: Expose the missing `LabeledMetricType` and `TimespanMetricType` in Qt.

# v0.10.2 (2021-04-26)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.10.1...v0.10.2)

* [#256](https://github.com/mozilla/glean.js/pull/256): BUGFIX: Add the missing `js` extension to the dispatcher.

# v0.10.1 (2021-04-26)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.10.0...v0.10.1)

* [#254](https://github.com/mozilla/glean.js/pull/254): BUGFIX: Allow the usage of the Glean specific metrics API before Glean is initialized.

# v0.10.0 (2021-04-20)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.9.2...v0.10.0)

* [#228](https://github.com/mozilla/glean.js/pull/228): Provide a Qt build with every new release.
* [#227](https://github.com/mozilla/glean.js/pull/227): BUGFIX: Fix a bug that prevented using `labeled_string` and `labeled_boolean`.
* [#226](https://github.com/mozilla/glean.js/pull/226): BUGFIX: Fix Qt build configuration to target ES5.

# v0.9.2 (2021-04-19)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.9.1...v0.9.2)

* [#220](https://github.com/mozilla/glean.js/pull/220): Update `glean_parser` to version 3.1.1.

# v0.9.1 (2021-04-19)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.9.0...v0.9.1)

* [#219](https://github.com/mozilla/glean.js/pull/219): BUGFIX: Fix path to ping entry point in package.json.

# v0.9.0 (2021-04-19)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.8.1...v0.9.0)

* [#201](https://github.com/mozilla/glean.js/pull/201): BUGFIX: Do not let the platform be changed after Glean is initialized.
* [#215](https://github.com/mozilla/glean.js/pull/215): Update the `glean-parser` to version 3.1.0.
* [#214](https://github.com/mozilla/glean.js/pull/215): Improve error reporting of the Glean command.

# v0.8.1 (2021-04-14)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.8.0...v0.8.1)

* [#206](https://github.com/mozilla/glean.js/pull/206): BUGFIX: Fix ping URL path.
  * Application ID was being reporting as `undefined`.

# v0.8.0 (2021-04-13)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.7.0...v0.8.0)

* [#173](https://github.com/mozilla/glean.js/pull/173): Drop Node.js support from webext entry points
* [#155](https://github.com/mozilla/glean.js/pull/155): Allow to define custom uploaders in the configuration.
* [#184](https://github.com/mozilla/glean.js/pull/184): Correctly report `appBuild` and `appDisplayVersion` if provided by the user.
* [#198](https://github.com/mozilla/glean.js/pull/198), [#192](https://github.com/mozilla/glean.js/pull/192), [#184](https://github.com/mozilla/glean.js/pull/184), [#180](https://github.com/mozilla/glean.js/pull/180), [#174](https://github.com/mozilla/glean.js/pull/174), [#165](https://github.com/mozilla/glean.js/pull/165): BUGFIX: Remove all circular dependencies.


# v0.7.0 (2021-03-26)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.6.1...v0.7.0)

* [#143](https://github.com/mozilla/glean.js/pull/143): Provide a way to initialize and reset Glean.js in tests.

# v0.6.1 (2021-03-22)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.6.0...v0.6.1)

* [#130](https://github.com/mozilla/glean.js/pull/130): BUGFIX: Fix destination path of CommonJS' build `package.json`.

# v0.6.0 (2021-03-22)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.5.0...v0.6.0)

* [#123](https://github.com/mozilla/glean.js/pull/123): BUGFIX: Fix support for ES6 environments.
  * Include `.js` extensions in all local import statements.
    * ES6' module resolution algorithm does not currently support automatic resolution of file extensions and does not have the hability to import directories that have an index file. The extension and the name of the file being import need to _always_ be specified. See: https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
  * Add a `type: module` declaration to the main `package.json`.
    * Without this statement, ES6 support is disabled. See: https://nodejs.org/docs/latest-v13.x/api/esm.html#esm_enabling.:
    * To keep support for CommonJS, in our CommonJS build we include a `package.json` that overrides the `type: module` of the main `package.json` with a `type: commonjs`.

# v0.5.0 (2021-03-18)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.4.0...v0.5.0)

* [#96](https://github.com/mozilla/glean.js/pull/96): Provide a ping encryption plugin.
  * This plugin listens to the `afterPingCollection` event. It receives the collected payload of a ping and returns an encrypted version of it using a JWK provided upon instantiation.
* [#95](https://github.com/mozilla/glean.js/pull/95): Add a `plugins` property to the configuration options and create an event abstraction for triggering internal Glean events.
  * The only internal event triggered at this point is the `afterPingCollection` event, which is triggered after ping collection and logging, and before ping storing.
  * Plugins are built to listen to a specific Glean event. Each plugin must define an `action`, which is executed everytime the event they are listening to is triggered.
* [#101](https://github.com/mozilla/glean.js/pull/101): BUGFIX: Only validate Debug View Tag and Source Tags when they are present.
* [#102](https://github.com/mozilla/glean.js/pull/102): BUGFIX: Include a Glean User-Agent header in all pings.
* [#97](https://github.com/mozilla/glean.js/pull/97): Add support for labeled metric types (string, boolean and counter).
* [#105](https://github.com/mozilla/glean.js/pull/105): Introduce and publish the `glean` command for using the `glean-parser` in a virtual environment.

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
