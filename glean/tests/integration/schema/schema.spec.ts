/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import https from "https";
import { validate } from "jsonschema";

import type { JSONObject } from "../../../src/core/utils";
import Glean from "../../../src/core/glean";
import { WaitableUploader } from "../../utils";

// Generated files.
import * as metrics from "./generated/forTesting";
import * as pings from "./generated/pings";
import { testResetGlean } from "../../../src/core/testing";
import { testInitializeGlean, testUninitializeGlean } from "../../../src/core/testing/utils";

const GLEAN_SCHEMA_URL = "https://raw.githubusercontent.com/mozilla-services/mozilla-pipeline-schemas/main/schemas/glean/glean/glean.1.schema.json";

/**
 * Fetch the schema as a JSON object from the GLEAN_SCHEMA_URL.
 *
 * @returns The schema.
 */
function fetchSchema(): Promise<JSONObject> {
  return new Promise((resolve, reject) => {
    https.get(GLEAN_SCHEMA_URL, response => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(JSON.parse(data));
        } catch(e) {
          console.error("Data received from the GLEAN_SCHEMA_URL is not valid JSON.\n\n", data);
          reject();
        }
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

describe("schema", function() {
  const testAppId = `gleanjs.test.${this.title}`;
  let pingSchema: JSONObject | null;

  before(async function () {
    // Only fetch the schema once for all the tests.
    pingSchema = await fetchSchema();
  });

  it("validate generated ping is valid against glean schema", async function () {
    const httpClient = new WaitableUploader();
    await testResetGlean(testAppId, true, { httpClient });

    // Record something for each metric type.
    //
    // Disable eslint rules for the recording calls,
    // so that we don't have to build the generated files just for the "lint" CI job.

    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    metrics.boolean.set(false);
    metrics.counter.add(10);
    metrics.datetime.set();
    metrics.event.record({
      sample_string: "hey",
      sample_boolean: false,
      sample_quantity: 42,
    });
    metrics.labeledBoolean["a_label"].set(true);
    metrics.labeledCounter["a_label"].add();
    metrics.labeledString["a_label"].set("ho");
    metrics.quantity.set(42);
    metrics.string.set("let's go");
    metrics.stringList.set(["let's go"]);
    metrics.text.set("let's gooooooooo");
    metrics.timespan.setRawNanos(10 * 10**6);
    metrics.uuid.generateAndSet();
    metrics.url.set("glean://test");
    const timerId = metrics.timingDistribution.start();
    metrics.timingDistribution.stopAndAccumulate(timerId);
    metrics.memoryDistribution.accumulate(100000);

    // Test both variations of custom distributions.
    metrics.customDistributionExp.accumulateSamples([1]);
    metrics.customDistributionLinear.accumulateSamples([1]);

    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

    // Set up the http client to catch the ping we will submit.
    const pingBody = httpClient.waitForPingSubmission("testing");
    // Submit the test ping.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    pings.testing.submit();

    // Validate the ping against the schema,
    // throws in case errors are found.
    validate(await pingBody, pingSchema, { throwError: true });
  });

  it("validate that the deletion-request is valid against glean schema", async function () {
    const httpClient = new WaitableUploader();
    await testResetGlean(testAppId, true, { httpClient });

    const deletionPingBody = httpClient.waitForPingSubmission("deletion-request");
    Glean.setUploadEnabled(false);

    validate(await deletionPingBody, pingSchema, { throwError: true });
  });

  it("validate that the deletion-request ping sent upon init is valid against glean schema", async function () {
    const httpClient = new WaitableUploader();
    const deletionPingBody = httpClient.waitForPingSubmission("deletion-request");

    // Reset Glean and enable upload.
    await testResetGlean(testAppId, true);

    // Re-start Glean with upload disabled, but don't clear stores.
    // We want to know that we were previously started with the upload enabled.
    await testUninitializeGlean(false);
    await testInitializeGlean(testAppId, false, { httpClient });

    validate(await deletionPingBody, pingSchema, { throwError: true });
  });
});
