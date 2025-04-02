# Architecture

This document aims to give a high-level overview of the
Glean JavaScript SDK (aka Glean.js) architecture.

This is a great place to start for newcomers to the project.

For in-depth documentation on specific implementation details of the library, refer to
the [Glean.js developer documentation](docs/README.md).

## Context

The Glean JavaScript SDK is part of [the Glean project](https://docs.telemetry.mozilla.org/concepts/glean/glean.html).
An end-to-end data collection platform developed by Mozilla and primarily targeting Mozilla products across multiple platforms.

Glean provides multiple client SDKs for different programming languages and platforms.
One of the aspects that guide Glean SDK development is cross-platform consistency and the Glean
JavaScript SDK is no exception to that. It is built to work on websites -- and to be easily extendable
to other platforms as well.

The Glean JavaScript SDK is the latest addition to the family of Glean SDKs. The other Glean SDKs,
namely Kotlin, Swift, Python, Rust and Firefox Desktop SDKs are not housed in this repository, but
in the [`mozilla/glean`](https://github.com/mozilla/glean) repository and for the case of the
Firefox Desktop SDK in the [mozilla-central](https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/glean) repository.

## Overview

On a very high level a Glean SDK is a library which exposes APIs for users to record
structured data and submit that data in an (again) structured format to a specific endpoint.

Users cannot simply record arbitrary data, though. The Glean SDKs expose specialized metrics APIs for
different collection needs. The SDK is responsible for validating that the data given by a user is in
the correct format and only then recording it (or recording an error in case the data provided is
not correct).

When data is submitted, the Glean SDK is responsible for assembling the correct group (aka ping) of data points
(aka metrics) in the format expected by the Glean pipeline, uploading the data and managing the local
storage. Each metric can have different [lifetimes](https://mozilla.github.io/glean/book/user/metrics/adding-new-metrics.html#a-lifetime-example)
and the SDK will manage its storage so that data does not remain in storage after it's lifetime is expired.

The Glean SDK tries to do all of this is the least disruptive way possible to users.

### Browser

All of the SDKs tasks are executed synchronously, immediately as they are called. Errors will be caught without ever crashing the application.

### Web Extensions

All of the SDKs tasks are queued and executed asynchronously. The APIs exposed by the Glean SDK will only do
the en-queuing of tasks, a quick synchronous operation. Internally, the Glean SDK will handle the
queued tasks asynchronously, catching any errors thrown along the way so that Glean never
crashes a users application.

The web extension SDK is currently not being developed. If you want to use the SDK in your web extension
please reference the [Glean.js user docs](https://mozilla.github.io/glean.js/getting_started/platforms/#deprecated-platforms).

## Code Map

The Glean JavaScript SDK source code lives under the `glean/src` folder.

```
├── core/               # Contains the bulk of the library's implementation
├── entry/              # Contains the different general API entry points for each platform
├── platform/           # Contains platforms specific implementations for specific modules
├── plugins/            # Contains plugins implementations
├── cli.ts              # Contains the Glean CLI implementation
├── metrics.yaml
└── pings.yaml
```

### `core/`

The `core/` folder is where developers will probably spend most of their time
when working on Glean.js. This folder contains the majority of the library implementation.

All of the code under this folder is expected to work across all platforms. Platform specific code
is centralized on the `platform/` folder which is covered in a later section of this document.

`glean.ts` contains the Glean [general API](https://mozilla.github.io/glean/book/reference/general/index.html)
implementation where Glean state is initialized and managed. Due to its centralizer aspect,
this file inevitably imports many of the other files on the library. As such,
developers should avoid importing this file in any of the other files on the `core/` folder,
because that can quickly cause a circular dependency mess.

`context.ts` is where circular dependencies go to die. When Glean.js was first implemented,
`glean.ts` not only managed and initialized Glean state, but it also exposed Glean state to the rest
of the library. That caused a huge issue with circular dependencies. The `context.ts` file was
created to mitigate that issue. This file houses the `Context` structure, a singleton that holds
setters and getters to all of Glean's internal state. This file should avoid any imports that are
not `import type`.

`metrics/types` is where all of the specific metric type implementations are. Each metric type
should be implemented in a single file and no other file types should be added to this folder,
because the files under this folder are exposed through the `@mozilla/glean/private/metrics/*`
entry point.

To see all the exposed entry points, check out Glean.js' `package.json` file.

### `entry/`

The `entry/` folder contains the main entry points for the Glean.js package per platform.
For example, when a user does `import Glean from @mozilla/glean/web` it's the `entry/web.ts`
file that they are getting and not `core/glean.ts`.

The main difference between each platform's file is that a different `Platform` implementation is
imported per file.

### `platform/`

Some modules such as storage and uploader, cannot be written in such a way that works
for all platforms, because each platform provides different APIs for these tasks. In order
for useless platform specific code not to bloat the size of the library on each platform,
the `platform/` module contains implementations of identical interfaces in different platforms.

This allows the pattern of only importing the necessary implementation of these modules on each platform.
It also makes testing easier, because the exact same suite of tests can be run for each of the platform-specific implementations,
 thus guaranteeing that each module works exactly the same on all platforms.

The storage module varies for each platform. The storage mechanism used by each platform is as follows:
- `web` - [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### `plugins/`

The `plugins/` folder contains the Glean.js' plugins code.

Each plugin is expected to be implemented in a single file, because these files are
exposed through the `@mozilla/glean/plugins/*` entry point.

### `cli.ts`

This file is what gets executed when a user that has installed Glean through npm invokes the `glean`
command. It serves as a wrapper to call `glean_parser` commands more easily from JavaScript projects.
