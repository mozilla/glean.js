# Getting started
This guide is for developers who want to develop on Glean.js.
## Prerequisites
Glean.js uses [Node.js](https://nodejs.org/).
Follow the [official guide](https://nodejs.dev/) to install it.
### Version requirements
* `node` >= 16.0.0
* `npm`  >=  7.0.0

## Building Glean.js
1.  a terminal, navigate to the directory you want the Glean.js repository to live. Then:
```bash
git clone https://github.com/mozilla/glean.js
```
2. navigate to the `glean` folder:
```bash
cd glean.js/glean
```
3. Install all the node modules used by Glean.js:
```bash
npm install
```
4. Build:
```bash
npm run build
```

## Running tests
Once you have [built](#building-gleanjs) Glean.js, run
```bash
npm run test
```
in the `glean` folder.

This runs all the tests in the `glean` folder.
Alternatively, you may want to run component-specific tests. 
To do so, substitute `test` in the command above with one of the followings:

* `test:unit:core` - executes tests inside `tests/unit/core` folder.
* `test:unit:plugins` - executes tests inside `tests/unit/plugins` folder.
* `test:unit:platform` - executes tests inside `tests/unit/platform` folder.
* `test:integration` - executes tests inside `tests/integration` folder.

You might want to run one specific test within a certain folder.
To run the test with the title `DatetimeMetric` in the `core` folder: 
```bash
npm run test:unit:core -- --grep "DateTimeMetric"
```
You should see the output similar to the following:
```shell

> @mozilla/glean@0.10.2 test:unit:core
> npm run test:base -- "tests/unit/core/**/*.spec.ts" --recursive "--grep" "DatetimeMetric"


> @mozilla/glean@0.10.2 test:base
> node --experimental-modules --experimental-specifier-resolution=node --loader=ts-node/esm node_modules/mocha/lib/cli/cli.js "tests/unit/core/**/*.spec.ts" "--recursive" "--grep" "DatetimeMetric"

(node:52217) ExperimentalWarning: --experimental-loader is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)


  DatetimeMetric
    ✓ datetime internal representation validation works as expected
    ✓ attempting to get the value of a metric that hasn't been recorded doesn't error
    ✓ attempting to set when glean upload is disabled is a no-op
Attempted to delete an entry from an invalid index. Ignoring.
Attempted to delete an entry from an invalid index. Ignoring.
Storage for deletion-request empty. Ping will still be sent.
Attempted to delete an entry from an invalid index. Ignoring.
Ping 053b739c-0b86-4032-ac45-29533d57ddc7 succesfully sent 200.
    ✓ ping payload is correct
    ✓ set properly sets the value in all pings
    ✓ truncation works
    ✓ get from different timezone than recording timezone keeps the original time intact


  7 passing (27ms)
```
