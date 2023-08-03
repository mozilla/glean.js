# Adding a new metric type

This document covers how to add new metric types to Glean.js. New metric types should only be implemented
after they were proposed and approved through Glean's metric type request process. If Glean is missing a
metric type you need, start by filing a request as described in the [process documentation](https://wiki.mozilla.org/Glean/Adding_or_changing_Glean_metric_types).

## Glossary

For the purposes of this document, when we say:

- **"Metric Type"** we mean an object that represents one of the metrics a user defined in their
  `metric.yaml` file. This object holds all the metadata related to a user defined metric as
  well as exposes the testing and recording APIs of the metric type. Example:

```ts
export const enlightening = new StringMetricType({
    category: "example",
    name: "enlightening",
    sendInPings: ["custom"],
    lifetime: "ping",
    disabled: false,
});
```

- **"Metric"** a wrapper object around a concrete value to record for a metric type. Example:

```ts
// Under the hood, Glean.js will use the value passed to `set` to instantiate a new StringMetric.
enlightening.set("a-ha");
```

## Implementation guide

Glean.js' metric type code lives on the `glean/src/core/metrics/types` folder. Once your metric type
request is approved, create a new file on that folder to accommodate your new metric type.

### The `Metric` class

Inside the file you just created, define a class that extends the
[`Metric`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/index.ts#L20)
abstract class.

This class will be used for instantiating metrics of your new type. Whenever a user
uses a metric type's recording APIs, a metric instance is created using the given value and
that is what Glean.js will record.

It expects two type arguments:

- `InternalRepresentation`: the representation in which this metric will be stored in memory.
- `PayloadRepresentation`: the representation in which this metric will be added to the ping payload.

For most metrics, both representations will be same, but some metrics may need extra information
on their internal representation in order to assist when deserializing for testing purposes
(e.g. the [`DatetimeMetric`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/types/datetime.ts#L27-L156)).

The `PayloadRepresentation` must match _exactly_ the representation of this metric on
[Glean's ping payload schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json).
However you define this representation will be the representation used by Glean.js'
when building ping payloads.

This subclass requires the you implement these two methods:

- [`validate`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/index.ts#L67):
Which validates that an `unknown` value is in the correct internal representation for the current metric.
This method will be used to validate values retrieved from the metrics database.

- [`payload`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/index.ts#L74):
Which returns the metric in it's `PayloadRepresentation`. This method will be used for building
ping payloads.

Let's look at an example:

```ts
// The string metric will be stored as a string and included in the ping payload as a string,
// so its internal and payload representation are of the same type.
class StringMetric extends Metric<string, string> {
  constructor(v: unknown) {
    // Calling `super` will call `validate` to check  that `v` is in the correct type.
    // In case it is not, this function will throw and no metric will be created.
    super(v);
  }

  validate(v: unknown): v is string {
    return typeof v === "string";
  }

  payload(): number {
    return this._inner;
  }
}
```

Once you have your `Metric` subclass, include it in Glean.js'
[`METRIC_MAP`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/utils.ts#L17).
This map will be used as a template for creating metric instances from the metrics database.

### The `InternalMetricType` class

Now you are ready to implement the `InternalMetricType` class for your new metric type.
This class will hold all the metadata related to a specific user defined metric and
expose the recording and testing APIs of your new metric type.

This class extends the [`MetricType`](https://github.com/mozilla/glean.js/blob/main/glean/src/core/metrics/index.ts#L110) abstract class. Different from the `Metric` class, this class does not have
any required methods to implement. Each metric type class will have a different API.
This API's design should have been discussed and decided upon during the metric type request process.

Still, metric type classes will always have at least one recording function and one testing function.

The Glean file generation is very particular with which files get bundled. This means
that the implementation for both `async` and `sync` metric recording exists in the same file. Each
metric file will have a set of marks `/// <something> ///` to denote which type of function should
live in that block. The common marks are: `SHARED`, `ASYNC`, `SYNC`, and `TESTING`.
Each function that lives under `SHARED` needs to conditionally check if the current platform is
synchronous.

For example:

```ts
/// SHARED ///
function set(value: string): void {
  if (Context.isPlatformSync()) {
    this.setSync(value);
  } else {
    this.setAsync(value);
  }
}

/// ASYNC ///
function setAsync(value: string): void {
  Context.dispatcher.launch(async () => {
    // Transform and record the metric.
  });
}

/// SYNC ///
function setSync(value: string): void {
  // Transform and record the metric.
}
```

> **Note** The `type` property on the `InternalMetricType` subclass is a constant. It will be used
> to determine in which section of the ping the recorded metrics for this type should be placed.
> It's value is the name of the section for this metric type on the ping payload.
> Make sure that, when you included your `Metric` class on the `METRIC_MAP` the property has the
> same value as the `type` property on the corresponding `InternalMetricType`.

#### Recording functions

_Functions that call Glean.js' database and store concrete values of a metric type._

##### async

Database calls are all asynchronous, but Glean.js' external API must **never** return promises.
Therefore, Glean.js has an internal dispatcher. Asynchronous tasks are dispatched and the dispatcher
will guarantee that they are executed in order without the user having to worry about
awaiting or callbacks.

This is to say: any recording action must be wrapped in a `Glean.dispatcher.launch` block.

Continuing with the String metric type example,
let's look at what a simple string recording function will look like.

```ts
function set(value: string): void {
  Glean.dispatcher.launch(async () => {
    // !IMPORTANT! Always check whether or not metrics should be recorded before recording.
    //
    // Metrics must not be recorded in case: upload is disabled or the metric is expired.
    if (!this.shouldRecord()) {
      return;
    }

    await Glean.metricsDatabase.record(this, value);
  });
}
```

##### sync

Database calls are synchronous and nothing is sent to the dispatcher. You do not need to wrap
the call inside of any callback, you can call it directly. You do need to cast the `metricsDatabase`
to its synchronous type when calling.

```ts
function set(value: string): void {
  // !IMPORTANT! Always check whether or not metrics should be recorded before recording.
  //
  // Metrics must not be recorded in case: upload is disabled or the metric is expired.
  if (!this.shouldRecord()) {
    return;
  }

  (Glean.metricsDatabase as MetricsDatabaseSync).record(this, value);
}
```

#### Testing functions

_Functions that allow users to check what was recorded for the current metric type instance._

Because all recording actions are dispatched, testing actions must also be dispatched so that they
are guaranteed to run _after_ recording is finished. We cannot use the usual `Glean.dispatcher.launch`
function in this case though, because we cannot await on our actions completion when we use it.

Instead we will use the `Glean.dispatcher.testLaunch` API which let's us await on the launched function.

Again on the String metric type example:

```ts
async function testGetValue(ping: string = this.sendInPings[0]): Promise<string | undefined> {
  let metric: string | undefined;
  await Glean.dispatcher.testLaunch(async () => {
    metric = await Glean.metricsDatabase.getMetric<string>(ping, this);
  });
  return metric;
}
```

> **Note**: All testing functions must start with the prefix `test`.

The `testGetNumRecordedErrors` function does not need to be implemented individually per metric
type as it is already implemented on the `MetricType` super class.

### The `MetricType` class

The `MetricType` class is the default export on each metric type file. It exposes **only** the APIs
users will interact with and contains the `InternalMetricType` instance as a [private field](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields).
It is a wrapper around the `InternalMetricType`.

Once you are done implementing the `MetricType` class for your new metric type,
make sure to manually expose it for Qt platforms by adding it to
[the Qt entry point file](https://github.com/mozilla/glean.js/blob/main/glean/src/entry/qt.ts).

## Testing

Tests for metric type implementations live under the `glean/tests/unit/core/metrics/types` folder. Create a new
file with the same name as the one you created in `glean/src/core/metrics/types` to accommodate your
metric type tests.

Make sure your tests cover at least your metric types basic functionality:

- The metric returns the correct value when it has no value;
- The metric correctly reports errors;
- The metric returns the correct value when it has value.

### Glean schema

It is very important to also check if the new metric payload is valid against the Glean schema.
Declare a new instance of the metrics you just implemented in `glean/test/integration/schema/metrics.yaml`
and then make sure you record to that metrics on the `validate generated ping is valid against glean schema`
test on the `glean/test/integration/schema/schema.spec.ts` test.

This test will fail unless schema changes to accommodate the new metric type have already landed.
Please see the [mozilla-pipeline-schemas](#mozilla-pipeline-schemas) section on how to add new metric
types to the Glean schema.

## Documentation

Glean.js' has linter rules that enforce [JSDoc](https://jsdoc.app/) strings on every public function.

Moreover, once a new metric type is added to Glean.js, a new documentation page must be added to the user
facing documentation on [the Glean book](https://mozilla.github.io/glean/book/index.html).

Source code for the Glean book lives on the [`mozilla/glean`](https://github.com/mozilla/glean) repository.

Once you are on that repository:

- Add a new file for your new metric in `docs/user/user/metrics/`.
  Its contents should follow the form and content of the other examples in that folder.
- Reference that file in `docs/user/SUMMARY.md` so it will be included in the build.
- Follow the [Documentation Contribution Guide](https://mozilla.github.io/glean/dev/docs.html).

Finally, on this repository we have a documentation page on the estimated sizes of the `@mozilla/glean`
package. That page is auto generated by the `automation/` project.

In order for the new metric type to be contemplated on this documentation it needs to be added to
the [`METRIC_TYPES`](../../automation/size/utils.js) array. Include the name of the new metric type
file on that array, but do not regenerate the documentation just yet. It will be regenerated every time
a new release of Glean.js is made.

## Other

Even after you are done with all the above steps, you still need to prepare other parts of the Glean
ecosystem in order for you to be done implementing your new metric type.

### glean_parser

New metric types need to be added to `glean_parser` so that they can be generated
from users `.yaml` files.

Please refer to the[`glean_parser` documentation](https://mozilla.github.io/glean_parser/contributing.html)
on how to do that.

### mozilla-pipeline-schemas

New metrics types must also be added to the Glean schema on the [`mozilla-pipeline-schemas`](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json).
This step makes the Glean pipeline aware of the new metric type, before it is completed all ping
payloads containing the new metric type will be rejected as a schema error.

Please refer to the [mozilla-pipeline-schemas documentation](https://github.com/mozilla-services/mozilla-pipeline-schemas#contributions) on how to do that.

### The Glean SDK

When adding a new metric type to Glean.js you may also want to add it to the Glean SDK.

If that is the case, please refer to
[the Glean SDK's developer documentation](https://mozilla.github.io/glean/dev/core/new-metric-type.html)
on adding new metric types.

> **Note**: This step is not mandatory. If a metric type is only implemented in Glean.js you may
> start to use it in production given that all the other above steps were completed.
