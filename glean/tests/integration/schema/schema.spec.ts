/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import https from "https";
import { validate } from "jsonschema";

import type { UploadResult } from "../../../src/core/upload/uploader";
import type Uploader from "../../../src/core/upload/uploader";
import type { JSONObject } from "../../../src/core/utils";
import Glean from "../../../src/core/glean";
import { UploadResultStatus } from "../../../src/core/upload/uploader";

// Generated files.
import * as metrics from "./generated/forTesting";
import * as pings from "./generated/pings";
import { unzipPingPayload } from "../../utils";

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
        resolve(JSON.parse(data));
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
class WaitableHttpClient implements Uploader {
  private waitingFor?: string;
  private waitResolver?: (pingBody: JSONObject) => void;

  /**
   * Returns a promise that resolves once a ping is submitted or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   * @returns A promise that resolves once a ping is submitted or times out after a 2s wait.
   */
  waitForPingSubmission(name: string): Promise<JSONObject> {
    this.waitingFor = name;
    return new Promise<JSONObject>((resolve, reject) => {
      this.waitResolver = (pingBody: JSONObject) => {
        this.waitingFor = undefined;
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(pingBody, null, 2));
        resolve(pingBody);
      };

      setTimeout(() => reject(), 2000);
    });
  }

  post(url: string, body: string): Promise<UploadResult> {
    if (this.waitingFor && url.includes(this.waitingFor)) {
      this.waitResolver?.(unzipPingPayload(body));
    }

    return Promise.resolve({
      result: UploadResultStatus.Success,
      status: 200
    });
  }
}

describe("schema", function() {
  const testAppId = `gleanjs.test.${this.title}`;
  let pingSchema: JSONObject | null;

  before(async function () {
    // Only fetch the schema once for all the tests.
    pingSchema = await fetchSchema();
  });

  it("validate generated ping is valid against glean schema", async function () {
    const httpClient = new WaitableHttpClient();
    await Glean.testResetGlean(testAppId, true, { httpClient });

    // Record something for each metric type.
    //
    // Disable eslint rules for the recording calls,
    // so that we don't have to build the generated files just for the "lint" CI job.

    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    metrics.boolean.set(false);
    metrics.counter.add(10);
    metrics.datetime.set();
    metrics.event.record({ sample: "hey" });
    metrics.labeledBoolean["a_label"].set(true);
    metrics.labeledCounter["a_label"].add();
    metrics.labeledString["a_label"].set("ho");
    metrics.quantity.set(42);
    metrics.string.set("let's go");
    metrics.timespan.setRawNanos(10 * 10**6);
    metrics.uuid.generateAndSet();
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

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
    const httpClient = new WaitableHttpClient();
    await Glean.testResetGlean(testAppId, true, { httpClient });

    const deletionPingBody = httpClient.waitForPingSubmission("deletion-request");
    Glean.setUploadEnabled(false);

    validate(await deletionPingBody, pingSchema, { throwError: true });
  });
});
