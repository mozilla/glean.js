# Bundle Size Considerations

The size of the Glean JavaScript library needs to be watched closely during development.
The smaller the library the better for embedding on websites, specifically.
There are a few practices that should be kept in mind while developing Glean.js as well
as tools that are setup to help in monitoring the library size continually.

## Practices

### Keep platform specific code on the `platform/` module

Logic that checks for feature availability at runtime should be avoided.
Instead, any code that is platform dependent should be exposed through the
`Platform` interface. This ensures that code will only be imported when
importing Glean on the target platform.

See more about the `platform/` module on the [Architecture Overview](../../ARCHITECTURE.md).

### Specialized features should be implemented as plugins

The Glean SDKs support features that are meant for specialized use cases,
such as ping encryption or the experiments API.

Any feature that fits this description i.e. a feature that may only be useful to a parcel of the users,
should be implemented as a plugin on the Glean JavaScript SDK.

See more about the plugins on the [Plugins and Events documentation](../plugins-events.md).

### Anything that can be opt-in should be

This topic cover the previous two topics as well, but there is a bit more to it than
confining platform specific code to the `platform/` and specialized features to plugins.

Nothing that is not required to initialize Glean, should not be part of the main library
and should only be part of the bundle when imported.

This applies for example to metric types. Metric types are only actually imported when they are used.
To achieve this, each metric type registers itself when first created through the
`Context.addSupportedMetric` API.

This has a significant size impact on the final bundle and leaves developers free to implement
as many specialized metric types as they'd like without worrying that all users will pay
a size cost for that.

Such patterns should always be considered when developing Glean.js.

> Note: This does not apply to the QML build of the library. QML libraries are not consumed
> as ES modules. The QML library is distributed as a compressed file on the GitHub releases
> page and it contains all of the metric types in once single file.

### Be mindful when adding dependencies

Before adding any dependency to Glean.js check if that dependency is strictly necessary,
the least dependencies the easier to manage the size of the library.

## Tools

### Automatic bundle sizes documentation

Every time a new release of Glean.js is made, the release script will also update the
[Metric sizes documentation](../reference/sizes.md). This helps developers to me mindful
about the size impact of each change to the final bundle as well as the size of each individual
plugin and metric.

### `check-size` CI job

The `check-size` job is available for each PR. It is not run automatically, but needs to be
approved by someone with CircleCI access to the project. It's a useful tool for checking
if an specific change has a large size impact and a quicker way to re-asses than the bundle
sizes documentation.

This job can also be run locally, by going into the `/automation` folder and running

```bash
nom run size:report:dry
```
