# Plugins

Plugins provide a way for the Glean JS SDK to support specialized use cases without bloating
the size of the library. Each plugin can be attached to a Glean core event to augment
or modify its behaviour.

A Glean plugin is a class that extends the [`Plugin`](https://mozilla.github.io/glean.js/classes/plugins.default.html) class. Each plugin instance exposes an
`action` API, to be triggered by the event. The signature of the `action` API will depend on
the event the plugin is attached to.

## Core events

Events denote a specific moment in code that may have a plugin attached to it.

A Glean event is an instance of the [`CoreEvent`](https://mozilla.github.io/glean.js/classes/core_events.CoreEvent.html) class. These instances expose a `trigger` API,
for triggering the action of a plugin that may be attached to it. Each event defines a different
signature for the `trigger` API.

## When should we implement a feature as a plugin?

When a requested feature would make more sense as a plugin than as a core feature
we should create a new plugin and event for it. However, when is that?

Plugins should always be the choice when we are implementing a feature that has a very specialized
use case and would be left unused by most users.

The [`PingEncryptionPlugin`](https://mozilla.github.io/glean.js/classes/plugins_encryption.default.html)
is a good example of that. That plugin encrypts all outgoing pings when enabled. It is a fairly large
plugin due to the encryption dependencies it includes in the bundle and it is only used by a small
amount of clients. It makes sense to make it a stand-alone feature.

> **Note**: Even if a feature is not as large as the encryption feature, if it is not used by most
> clients we should always consider making it a plugin. Multiple small features that are not used
> can also sum up to a large unnecessary size increase and we want to avoid that.

## Creating a new event and plugin

Since plugins and events are a very recent tool for Glean.js developers,
Glean.js does not have many events already implemented.

It is likely that when implementing new plugins we will also have to implement the event that
triggers the new plugin. This checklist covers the whole process from adding an event to adding a plugin.

1. Add a new event to the `CoreEvents` list on `/core/events/index.ts`.
2. Trigger the event at the expected time. This varies per event.
3. Create a new plugin file under `/plugins/`.
4. Implement the plugin to attach to the newly created event.
5. Add the new plugins to the [`PLUGINS`](../../benchmarks/size/utils.js) array on the benchmarks project, in order for it's size impact to the be added to the auto-generated sizes documentation on every release.
6. Document the new plugin on [the Glean book](https://mozilla.github.io/glean/book/language-bindings/javascript/plugins/index.html).

> **Note**: Although we can create different plugins that attach to the same event,
> only one plugin may be attached to each event at a time.
