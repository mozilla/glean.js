# Glean.js benchmarks

## Size

The size project contains benchmarking scripts
for analyzing the size of the Glean.js library.

### Report

Compare the size of the different Glean bundles across the local `main`
branch and the current checkout.

To run a local report:

```
npm run size:report:dry
```

To run the report and post the results to a GitHub pull request:

```
npm run size:report
```

> **Note**: This script requires the `GITHUB_TOKEN` environment variable
> and the CircleCI environment to know which PR to post to.
> It is not really meant to be run outside of CircleCI.

### Docs

Builds the Glean.js library for all the targeted platforms and document
the size of the library and of each extra metric and plugin.

To run the script without updating the documentation:

```
npm run size:docs:dry
```

To run the script and update the documentation.

```
npm run size:docs
```

## Browser compatibility

The compat project contains benchmarking scripts
for smoke testing Glean.js in various supported browsers.

To run the test locally in Firefox only:

```
npm run compat:test
```

To run the test in BrowserStack in a list of different browsers,
both in the minimum known supported version of the browser
and in the latest version of the browser:

```
npm run compat:test:browserstack
```

> **Note**: This script expects the `BROWSERSTACK_USER_NAME` and
> `BROWSERSTACK_ACCESS_KEY` environment variables to be set.
