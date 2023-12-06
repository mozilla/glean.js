# Unreleased changes

[Full changelog](https://github.com/mozilla/glean.js/compare/v4.0.0-pre.1...main)

* [#1846](https://github.com/mozilla/glean.js/pull/1846): Add logging messages when using the debugging APIs from the browser console.

# v4.0.0-pre.1 (2023-12-01)

[Full changelog](https://github.com/mozilla/glean.js/compare/v4.0.0-pre.0...v4.0.0-pre.1)

[#1834](https://github.com/mozilla/glean.js/pull/1834): Added support for `navigator.sendBeacon`. This is not turned on by default and needs to be enabled manually.

# v4.0.0-pre.0 (2023-11-27)

[Full changelog](https://github.com/mozilla/glean.js/compare/v3.0.0...v4.0.0-pre.0)

[#1808](https://github.com/mozilla/glean.js/pull/1808): **BREAKING CHANGE**: Make glean.js fully synchronous.

* [#1835](https://github.com/mozilla/glean.js/pull/1835): Automatic instrumentation of page load events for simple web properties.

# v3.0.0 (2023-11-16)

[Full changelog](https://github.com/mozilla/glean.js/compare/v3.0.0-pre.1...v3.0.0)

This is the official release based on v3.0.0-pre.1.

# v3.0.0-pre.1 (2023-11-15)

[Full changelog](https://github.com/mozilla/glean.js/compare/v3.0.0-pre.0...v3.0.0-pre.1)

* [#1814](https://github.com/mozilla/glean.js/pull/1814): **BREAKING CHANGE**: Temporarily drop support for web extensions. This platform will be added again once we complete the Glean.js platform refactoring.

# v3.0.0-pre.0 (2023-11-10)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.5...v3.0.0-pre.0)

* [#1810](https://github.com/mozilla/glean.js/pull/1810): **BREAKING CHANGE**: Drop support for QT.
* [#1811](https://github.com/mozilla/glean.js/pull/1811): Update `glean_parser` to `v10.0.3`.

# v2.0.5 (2023-10-16)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.4...v2.0.5)

* [#1788](https://github.com/mozilla/glean.js/pull/1788): Fix `window` is undefined error when setting up browser debugging.

# v2.0.4 (2023-10-10)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.3...v2.0.4)

* [#1772](https://github.com/mozilla/glean.js/pull/1772): Fix bug where `window.Glean` functions were getting set on non-browser properties.
* [#1784](https://github.com/mozilla/glean.js/pull/1784): Store `window.Glean` debugging values in `sessionStorage`. This will set debug options on page init while the current session is still active.

# v2.0.3 (2023-09-27)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.2...v2.0.3)

* [#1770](https://github.com/mozilla/glean.js/pull/1770): Allow debugging in browser console via `window.Glean`.

# v2.0.2 (2023-09-14)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.1...v2.0.2)

* [#1768](https://github.com/mozilla/glean.js/pull/1768): Add support for `GLEAN_PYTHON` and `GLEAN_PIP` environment variables.
* [#1755](https://github.com/mozilla/glean.js/pull/1755): Add sync check to `set` function for the URL metric.
* [#1766](https://github.com/mozilla/glean.js/pull/1766): Update default `maxEvents` count to 1. This means an events ping will be sent after each recorded event unless the `maxEvents` count is explicitly set to a larger number.

# v2.0.1 (2023-08-11)

[Full changelog](https://github.com/mozilla/glean.js/compare/v2.0.0...v2.0.1)

* [#1751](https://github.com/mozilla/glean.js/pull/1751): Add a migration flag to initialize. If not explicitly set in the `config` object the migration from IndexedDB to LocalStorage will not occur. **The only projects that should ever set this flag are those that have used Glean.js in production with a version <v2.0.0 and have upgraded.**

# v2.0.0 (2023-08-03)

[Full changelog](https://github.com/mozilla/glean.js/compare/v1.4.0...v2.0.0)

**Important**

This version of Glean.js migrates the browser implementation from using IndexedDB to using LocalStorage. The storage change means that all Glean.js actions run synchronously.

* [#1748](https://github.com/mozilla/glean.js/pull/1748): Update glean_parser version to the latest.
* [#1733](https://github.com/mozilla/glean.js/pull/1733): Add SSR support for Glean.js.
* [#1728](https://github.com/mozilla/glean.js/pull/1728): Migrate client_id and first_run_date.
* [#1695](https://github.com/mozilla/glean.js/pull/1695): Update Glean.js web to use LocalStorage.

# v1.4.0 (2023-05-10)

[Full changelog](https://github.com/mozilla/glean.js/compare/v1.3.0...v1.4.0)

* [#1671](https://github.com/mozilla/glean.js/pull/1671): Allow building on Windows machines.
* [#1674](https://github.com/mozilla/glean.js/pull/1674): Upgrade `glean_parser` version to `7.2.1`.

# v1.3.0 (2022-10-18)

[Full changelog](https://github.com/mozilla/glean.js/compare/v1.2.0...v1.3.0)

* [#1544](https://github.com/mozilla/glean.js/pull/1544): Upgrade `glean_parser` version to `6.2.1`.
* [#1516](https://github.com/mozilla/glean.js/pull/1516): Implement the Custom Distribution metric type.
* [#1514](https://github.com/mozilla/glean.js/pull/1514): Implement the Memory Distribution metric type.
* [#1475](https://github.com/mozilla/glean.js/pull/1475): Implement the Timing Distribution metric type.

# v1.2.0 (2022-09-21)

[Full changelog](https://github.com/mozilla/glean.js/compare/v1.1.0...v1.2.0)

* [#1513](https://github.com/mozilla/glean.js/pull/1513): Bump URL metric character limit to 8k to support longer URLs. URLs that are too long now are truncated to `URL_MAX_LENGTH` and still recorded along with an Overflow error.
* [#1500](https://github.com/mozilla/glean.js/pull/1500): BUGFIX: Update how we invoke CLI python script to fix `npm run glean` behavior on Windows.
* [#1457](https://github.com/mozilla/glean.js/pull/1457): Update `ts-node` to 10.8.0 to resolve ESM issues when running tests inside of `webext` sample project.
* [#1452](https://github.com/mozilla/glean.js/pull/1452): Remove `glean.restarted` trailing events from events list.
* [#1450](https://github.com/mozilla/glean.js/pull/1450): Update `ts-node` to 10.8.0 to resolve ESM issues when running tests.
* [#1449](https://github.com/mozilla/glean.js/pull/1449): BUGFIX: Add missing quotes to `prepare-release` script to fix issues with version numbers in Qt sample README & circle ci config.
* [#1449](https://github.com/mozilla/glean.js/pull/1449): Update Qt sample project docs to include note about problems with different version numbers of Qt commands.

# v1.1.0 (2022-07-18)

[Full changelog](https://github.com/mozilla/glean.js/compare/v1.0.0...v1.1.0)

* [#1318](https://github.com/mozilla/glean.js/pull/1318): Expose `ErrorType` through its own entry point.
* [#1271](https://github.com/mozilla/glean.js/pull/1271): BUGFIX: Fix pings validation function when scanning pings database on initialize.
  * This bug was preventing pings that contained custom headers from being successfully validated and enqueued on initialize.
* [#1335](https://github.com/mozilla/glean.js/pull/1335): BUGFIX: Fix uploading gzip-compressed pings in Node.
* [#1415](https://github.com/mozilla/glean.js/pull/1415): BUGFIX: Publish the TS type information for the `web` platform.

# v1.0.0 (2022-03-17)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.32.0...v1.0.0)

* [#1154](https://github.com/mozilla/glean.js/pull/1130): BUGFIX: Implemented initialize and set_upload_enabled reasons for deletion-request ping.
* [#1233](https://github.com/mozilla/glean.js/pull/1233): Add optional `buildDate` argument to `initialize` configuration. The build date can be generated by glean_parser.
* [#1233](https://github.com/mozilla/glean.js/pull/1233): Update glean_parser to version 5.1.0.
* [#1217](https://github.com/mozilla/glean.js/pull/1217): Record `InvalidType` error when incorrectly type values are passed to metric recording functions.
* [#1267](https://github.com/mozilla/glean.js/pull/1267): Implement the 'events' ping.

# v0.32.0 (2022-03-01)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.31.0...v0.32.0)

* [#1220](https://github.com/mozilla/glean.js/pull/1220): Refactor virtual environment behavior to support virtual environments that aren't in the project root.
* [#1130](https://github.com/mozilla/glean.js/pull/1130): BUGFIX: Guarantee event timestamps
cannot be negative numbers.
  * Timestamps were observed to be negative in a few occurrences, for platforms that do not provide the `performance.now` API, namely QML, and in which we fallback to the `Date.now` API.
  * If event timestamps are negative pings are rejected by the pipeline.
* [#1132](https://github.com/mozilla/glean.js/pull/1132): Retry ping request on network error with `keepalive: false`. This is sometimes an issue on Chrome browsers below v81.
* [#1170](https://github.com/mozilla/glean.js/pull/1170): Update glean_parser to version 5.0.0.
* [#1178](https://github.com/mozilla/glean.js/pull/1178): Enable running the `glean` command offline.
  * When offline Glean will not attempt to install glean_parser.
* [#1178](https://github.com/mozilla/glean.js/pull/1178): Enable running the `glean` command with as many or as little arguments as wanted.
  * Previously the command could only be run with 3 commands, even though all glean_parser commands would have been valid commands for the `glean` CLI.
* [#1210](https://github.com/mozilla/glean.js/pull/1210): Show comprehensive error message when missing `storage` permissions for Glean on web extensions.
* [#1223](https://github.com/mozilla/glean.js/pull/1223): Add `--glean-parser-version` command to CLI to allow users to retrieve the glean_parser version without installing glean_parser.
* [#1228](https://github.com/mozilla/glean.js/pull/1228): BUGFIX: Apply debug features before sending pings at initialize.

# v0.31.0 (2022-01-25)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.30.0...v0.31.0)

* [#1065](https://github.com/mozilla/glean.js/pull/1065): Delete minimal amount of data when invalid data is found while collecting ping.
  * Previous behavior was to delete the whole ping when invalid data was found on the database,
  new behavior only deletes the actually invalid data and leave the rest of the ping intact.
* [#1065](https://github.com/mozilla/glean.js/pull/1065): Only import metric types into the library when they are used either by the user or Glean itself.
  * Previously the code required to deserialize metric data from the database was always imported by the library even if the metric type was never used by the client. This effort will decrease the size of the Glean.js bundles that don't import all the metric types.
* [#1046](https://github.com/mozilla/glean.js/pull/1046): Remove legacy X-Client-Type X-Client-Version from Glean pings.
* [#1071](https://github.com/mozilla/glean.js/pull/1071): **BREAKING CHANGE**: Move the `testResetGlean` API from the Glean singleton and into it's own entry point `@mozilla/glean/testing`.
  * In order to use this API one must import it through `import { testResetGlean } from "@mozilla/glean/testing"` instead of using it from the Glean singleton directly.
  * This lower the size of the Glean library, because testing functionality is not imported unless in a testing environment.
  * This change does not apply to QML. In this environment the API remains the same.

# v0.30.0 (2022-01-10)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.29.0...v0.30.0)

* [#1045](https://github.com/mozilla/glean.js/pull/1045): BUGFIX: Provide informative error message when unable to access database in QML.
* [#1077](https://github.com/mozilla/glean.js/pull/1077): BUGFIX: Do not clear lifetime metrics before submitting `deletion-request` ping on initialize.
  - This bug causes malformed `deletion-request` pings in Glean is initialized with `uploadEnabled=false`.

# v0.29.0 (2022-01-04)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.28.0...v0.29.0)

* [#1006](https://github.com/mozilla/glean.js/pull/1006): Implement the rate metric.
* [#1066](https://github.com/mozilla/glean.js/pull/1066): BUGFIX: Guarantee reported timestamps are never floating point numbers.
  * Floating point timestamps are rejected by the pipeline.

# v0.28.0 (2021-12-08)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.27.0...v0.28.0)

* [#984](https://github.com/mozilla/glean.js/pull/984): BUGFIX: Return correct upload result in case an error happens while building a ping request.
* [#988](https://github.com/mozilla/glean.js/pull/988): BUGFIX: Enforce rate limitation at upload time, not at ping submission time.
  * Note: This change required a big refactoring of the internal uploading logic.
* [#994](https://github.com/mozilla/glean.js/pull/994): Automatically restart ping upload once the rate limit window is ended.
  * Prior to this change, ping uploading would only be resumed once the `.submit()` API was called again, even if Glean was not throttled anymore.
  * **Note**: this change does not apply to QML. We used the `setTimeout`/`clearTimeout` APIs in this feature and those are not available on the QML platform. Follow [Bug 1743140](https://bugzilla.mozilla.org/show_bug.cgi?id=1743140) for updates.
* [#1015](https://github.com/mozilla/glean.js/pull/1015): BUGFIX: Make attempting to call the `setUploadEnabled` API before initializing Glean a no-op.
* [#1016](https://github.com/mozilla/glean.js/pull/1016): BUGFIX: Make shutdown a no-op in case Glean is not initialized.

# v0.27.0 (2021-11-22)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.26.0...v0.27.0)

* [#981](https://github.com/mozilla/glean.js/pull/981): Update rate limits for ping submission from 15 pings/minute to 40 pings/minute.
* [#967](https://github.com/mozilla/glean.js/pull/967): **BREAKING CHANGE**: Remove `debug` option from Glean configuration option.
  * The `Glean.setDebugViewTag`, `Glean.setSourceTags` and `Glean.setLogPings` should be used instead. Note that these APIs can safely be called prior to initialization.

# v0.26.0 (2021-11-19)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.25.0...v0.26.0)

* [#965](https://github.com/mozilla/glean.js/pull/965): Attempt to infer the Python virtualenv folder from the environment before falling back to the default `.venv`.
  * Users may provide a folder name through the `VIRTUAL_ENV` environment variable.
  * If the user is inside an active virtualenv the `VIRTUAL_ENV` environment variable is already set by Python. See: https://docs.python.org/3/library/venv.html.
* [#968](https://github.com/mozilla/glean.js/pull/968): Add runtime arguments type checking to `Glean.setUploadEnabled` API.
* [#970](https://github.com/mozilla/glean.js/pull/970): BUGFIX: Guarantee uploading is immediately resumed if the uploader has been stopped due to any of the uploading limits being hit.

# v0.25.0 (2021-11-15)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.24.0...v0.25.0)

* [#924](https://github.com/mozilla/glean.js/pull/924): Only HTTPS server endpoints outside of testing mode.
  * In testing mode HTTP may be used. No other protocols are allowed.
* [#951](https://github.com/mozilla/glean.js/pull/951): Expose Uploader, UploadResult and UploadResultStatus.
  * These are necessary for creating custom uploaders. Especially from TypeScript.

# v0.24.0 (2021-11-04)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.23.0...v0.24.0)

* [#856](https://github.com/mozilla/glean.js/pull/856): Expose the `@mozilla/glean/web` entry point for using Glean.js in websites.
* [#856](https://github.com/mozilla/glean.js/pull/860): Implement the `PlatformInfo` module for the web platform.
  * Out of `os`, `os_version`, `architecture` and `locale`, on the web platform, we can only retrieve `os` and `locale` information. The other information will default to the known value `Unknown` for all pings coming from this platform.
* [#856](https://github.com/mozilla/glean.js/pull/856): Expose the `@mozilla/glean/web` entry point for using Glean.js in websites.
* [#908](https://github.com/mozilla/glean.js/pull/908): BUGFIX: Guarantee internal `uploadEnabled` state always has a value.
  * When `uploadEnabled` was set to `false` and then Glean was restarted with it still `false`, the internal `uploadEnabled` state was not being set. That should not cause particularly harmful behavior, since `undefined` is still a "falsy" value. However, this would create a stream of loud and annoying log messages.
* [#898](https://github.com/mozilla/glean.js/pull/898): Implement the `Storage` module for the web platform.

# v0.23.0 (2021-10-12)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.22.0...v0.23.0)

* [#755](https://github.com/mozilla/glean.js/pull/755): Only allow calling of `test*` functions in "test mode".
  * Glean is put in "test mode" once the `Glean.testResetGlean` API called.
* [#811](https://github.com/mozilla/glean.js/pull/811): Apply various fixes to the Qt entry point file.
  * Expose `ErrorType`. This is only useful for testing purposes;
  * Fix version of `QtQuick.LocalStorage` plugin;
  * Fix the way to access the lib from inside the `shutdown` method. Previous to this fix, it is not possible to use the `shutdown` method;
  * Expose the `Glean.testRestGlean` API.
* [#822](https://github.com/mozilla/glean.js/pull/822): Fix API reference docs build step.
* [#825](https://github.com/mozilla/glean.js/pull/825): Accept `architecture` and `osVersion` as initialization parameters in Qt. In Qt these values are not easily available from the environment.

# v0.22.0 (2021-10-06)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.21.1...v0.22.0)

* [#796](https://github.com/mozilla/glean.js/pull/796): Support setting the `app_channel` metric.
  - As described in ["Release channels"](https://mozilla.github.io/glean/book/reference/general/initializing.html?highlight=channel#release-channels).
* [#799](https://github.com/mozilla/glean.js/pull/799): Make sure Glean does not do anything else in case initialization errors.
  - This may happen in case there is an error creating the databases. Mostly an issue on Qt/QML where we use a SQLite database which can throw errors on initialization.
* [#799](https://github.com/mozilla/glean.js/pull/799): Provide stack traces when logging errors.

# v0.21.1 (2021-09-30)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.21.0...v0.21.1)

* [#780](https://github.com/mozilla/glean.js/pull/780): Fix the publishing step for releases. The Qt-specific build should now publish correctly.

# v0.21.0 (2021-09-30)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.20.0...v0.21.0)

* [#754](https://github.com/mozilla/glean.js/pull/754): Change target ECMAScript target from 2015 to 2016 when building for Qt.
* [#779](https://github.com/mozilla/glean.js/pull/779): Add a number of workarounds for the Qt JavaScript engine.

* [#775](https://github.com/mozilla/glean.js/pull/775): Disallow calling test only methods outside of test mode.
  * NOTE: Test mode is set once the API `Glean.testResetGlean` is called.

# v0.20.0 (2021-09-17)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.19.0...v0.20.0)

* [#696](https://github.com/mozilla/glean.js/pull/696): Expose Node.js entry point `@mozilla/glean/node`.
* [#695](https://github.com/mozilla/glean.js/pull/695): Implement PlatformInfo module for the Node.js platform.
* [#695](https://github.com/mozilla/glean.js/pull/730): Implement Uploader module for the Node.js platform.

# v0.19.0 (2021-09-03)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.18.1...v0.19.0)

* [#526](https://github.com/mozilla/glean.js/pull/526): Implement mechanism to sort events reliably throughout restarts.
  * A new event (`glean.restarted`) will be included in the events payload of pings, in case there
  was a restart in the middle of the ping measurement window.
* [#534](https://github.com/mozilla/glean.js/pull/534): Expose `Uploader` base class through `@mozilla/glean/<platform>/uploader` entry point.
* [#580](https://github.com/mozilla/glean.js/pull/580): Limit size of pings database to 250 pings or 10MB.
* [#580](https://github.com/mozilla/glean.js/pull/580): BUGFIX: Pending pings at startup up are uploaded from oldest to newest.
* [#607](https://github.com/mozilla/glean.js/pull/607): Record an error when incoherent timestamps are calculated for events after a restart.
* [#630](https://github.com/mozilla/glean.js/pull/630): Accept booleans and numbers as event extras.
* [#647](https://github.com/mozilla/glean.js/pull/647): Implement the Text metric type.
* [#658](https://github.com/mozilla/glean.js/pull/658): Implement rate limiting for ping upload.
  * Only up to 15 ping submissions every 60 seconds are now allowed.
* [#658](https://github.com/mozilla/glean.js/pull/658): BUGFIX: Unblock ping uploading jobs after the maximum of upload failures are hit for a given uploading window.
* [#661](https://github.com/mozilla/glean.js/pull/661): Include unminified version of library on Qt/QML builds.
* [#681](https://github.com/mozilla/glean.js/pull/681): BUGFIX: Fix error in scanning events database upon initialization on Qt/QML.
  * This bug prevents the changes introduced in [#526](https://github.com/mozilla/glean.js/pull/526) from working properly in Qt/QML.
* [#692](https://github.com/mozilla/glean.js/pull/692): BUGFIX: Ensure events database is initialized at a time Glean is already able to record metrics.
  * This bug also prevents the changes introduced in [#526](https://github.com/mozilla/glean.js/pull/526) from working properly in all platforms.

# v0.18.1 (2021-07-22)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.18.0...v0.18.1)

* [#552](https://github.com/mozilla/glean.js/pull/552): BUGFIX: Do not clear `deletion-request` ping from upload queue when disabling upload.

# v0.18.0 (2021-07-20)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.17.0...v0.18.0)

* [#542](https://github.com/mozilla/glean.js/pull/542): Implement `shutdown` API.

# v0.17.0 (2021-07-16)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.16.0...v0.17.0)

* [#529](https://github.com/mozilla/glean.js/pull/529): Implement the URL metric type.

* [#526](https://github.com/mozilla/glean.js/pull/526): Implement new events sorting
logic, which allows for reliable sorting of events throughout restarts.

# v0.16.0 (2021-07-06)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.15.0...v0.16.0)

* [#346](https://github.com/mozilla/glean.js/pull/346): Provide default HTTP client for Qt/QML platform.
* [#399](https://github.com/mozilla/glean.js/pull/399): Check if there are ping data before attempting to delete it.
  * This change lowers the amount of log messages related to attempting to delete nonexistent data.
* [#411](https://github.com/mozilla/glean.js/pull/411): Tag all messages logged by Glean with the component they are coming from.
* [#415](https://github.com/mozilla/glean.js/pull/415), [#430](https://github.com/mozilla/glean.js/pull/430): Gzip ping payload before upload
  * This changes the signature of `Uploader.post` to accept `string | Uint8Array` for the `body` parameter, instead of only `string`.
* [#431](https://github.com/mozilla/glean.js/pull/431): BUGFIX: Record the timestamp for events before dispatching to the internal task queue.
* [#462](https://github.com/mozilla/glean.js/pull/462): Implement persistent storage for Qt/QML platform.
* [#466](https://github.com/mozilla/glean.js/pull/466): Expose `ErrorType` enum, for using with the `testGetNumRecordedErrors` API.
* [#497](https://github.com/mozilla/glean.js/pull/497): Implement limit of 1MB for ping request payload. Limit is calculated after gzip compression.

# v0.15.0 (2021-06-03)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.14.1...v0.15.0)

* [#389](https://github.com/mozilla/glean.js/pull/389): BUGFIX: Make sure to submit a `deletion-request` ping before clearing data when toggling upload.
* [#375](https://github.com/mozilla/glean.js/pull/375): Release Glean.js for Qt as a QML module.

# v0.14.1 (2021-05-21)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.14.0...v0.14.1)

* [#342](https://github.com/mozilla/glean.js/pull/342): BUGFIX: Fix timespan payload representation to match exactly the payload expected according to the Glean schema.
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
    * ES6' module resolution algorithm does not currently support automatic resolution of file extensions and does not have the ability to import directories that have an index file. The extension and the name of the file being import need to _always_ be specified. See: https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
  * Add a `type: module` declaration to the main `package.json`.
    * Without this statement, ES6 support is disabled. See: https://nodejs.org/docs/latest-v13.x/api/esm.html#esm_enabling.:
    * To keep support for CommonJS, in our CommonJS build we include a `package.json` that overrides the `type: module` of the main `package.json` with a `type: commonjs`.

# v0.5.0 (2021-03-18)

[Full changelog](https://github.com/mozilla/glean.js/compare/v0.4.0...v0.5.0)

* [#96](https://github.com/mozilla/glean.js/pull/96): Provide a ping encryption plugin.
  * This plugin listens to the `afterPingCollection` event. It receives the collected payload of a ping and returns an encrypted version of it using a JWK provided upon instantiation.
* [#95](https://github.com/mozilla/glean.js/pull/95): Add a `plugins` property to the configuration options and create an event abstraction for triggering internal Glean events.
  * The only internal event triggered at this point is the `afterPingCollection` event, which is triggered after ping collection and logging, and before ping storing.
  * Plugins are built to listen to a specific Glean event. Each plugin must define an `action`, which is executed every time the event they are listening to is triggered.
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

* [#90](https://github.com/mozilla/glean.js/pull/90): Provide exports for CommonJS and browser environments.
* [#90](https://github.com/mozilla/glean.js/pull/90): BUGFIX: Accept lifetimes as strings when instantiating metric types.
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
* [#26](https://github.com/mozilla/glean.js/pull/26): Implement the setUploadEnabled API.
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
