/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import CoreEvents, { CoreEvent } from "../../src/core/events";
import { registerPluginToEvent } from "../../src/core/events/utils";
import { JSONObject } from "../../src/core/utils";
import Plugin from "../../src/plugins";

const mockEvent = new CoreEvent<number[], number>("mockEvent");
class MockPlugin extends Plugin<typeof mockEvent> {
  constructor() {
    super(mockEvent.name, "mockPlugin");
  }

  action(...numbers: number[]): number {
    return numbers.reduce((sum, element) => element + sum, 0);
  }
}

describe("events", function() {
  afterEach(function () {
    mockEvent.deregisterPlugin();
  });

  it("registering a plugin works as expected", function() {
    const plugin = new MockPlugin();
    mockEvent.registerPlugin(plugin);
    assert.deepStrictEqual(mockEvent["plugin"], plugin);

    // Registering twice should not error, but also should be ignored.
    const pluginDuplicate = new MockPlugin();
    mockEvent.registerPlugin(pluginDuplicate);
    assert.deepStrictEqual(mockEvent["plugin"], plugin);
  });

  it("triggering an event works as expected", function() {
    // Triggering an event with no attached plugin should not error.
    assert.strictEqual(mockEvent.trigger(5, 5, 5, 5), undefined);

    const plugin = new MockPlugin();
    mockEvent.registerPlugin(plugin);

    assert.strictEqual(mockEvent.trigger(5, 5, 5, 5), 20);
  });

  it("registerPluginToEvent works as expected", function() {
    // The mock plugin is not going to get registered because mockEvent is not a real Glean event.
    // Either way we put this here to check it does not throw.
    registerPluginToEvent(new MockPlugin());

    // Now we define a plugin that is attached to a real glean event.
    class ValidMockPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
      constructor() {
        super(CoreEvents["afterPingCollection"].name, "mockPlugin");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      action(): Promise<JSONObject> {
        return Promise.resolve({ "you": "got mocked!" });
      }
    }
    const validPlugin = new ValidMockPlugin();
    registerPluginToEvent(validPlugin);
    assert.deepStrictEqual(CoreEvents.afterPingCollection["plugin"], validPlugin);
  });
});
