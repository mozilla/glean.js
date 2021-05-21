/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import https from "https";
import { validate } from "jsonschema";

import Glean from "../../../src/core/glean";
import Uploader, { UploadResult, UploadResultStatus } from "../../../src/core/upload/uploader";
import { JSONObject } from "../../../src/core/utils";

// Generated files.
import * as metrics from "./generated/forTesting";
import * as pings from "./generated/pings";

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
      reject(err)
    });
  });
}

/**
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
class WaitableHttpClient implements Uploader {
  private waitingFor?: string;
  private waitResolver?: (pingBody: string) => void;

  /**
   * Returns a promise that resolves once a ping is submitted or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   *
   * @returns A promise that resolves once a ping is submitted or times out after a 2s wait.
   */
  waitForPingSubmission(name: string): Promise<JSONObject> {
    this.waitingFor = name;
    return new Promise<JSONObject>((resolve, reject) => {
      this.waitResolver = (pingBody: string)  => {
        this.waitingFor = undefined;
        const parsedBody = JSON.parse(pingBody);
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(parsedBody, null, 2));
        resolve(parsedBody);
      };

      setTimeout(() => reject(), 2000);
    });
  }

  post(url: string, body: string): Promise<UploadResult> {
    if (this.waitingFor && url.includes(this.waitingFor)) {
      this.waitResolver!(body);
    }

    return Promise.resolve({
      result: UploadResultStatus.Success,
      status: 200
    });
  }
}

describe("schema", function() {
  it("validate generated ping is valid against glean schema", async function () {
    const httpClient = new WaitableHttpClient();
    Glean.testResetGlean(`gleanjs.test.${this.title}`, true, { httpClient });

    // Record something for each metric type.
    metrics.boolean.set(false);
    metrics.counter.add(10);
    metrics.datetime.set();
    metrics.event.record({ sample: "hey" })
    metrics.labeledBoolean["a_label"].set(true);
    metrics.labeledCounter["a_label"].add();
    metrics.labeledString["a_label"].set("ho");
    metrics.quantity.set(42);
    metrics.string.set("let's go");
    metrics.timespan.setRawNanos(10 * 10**6);
    metrics.uuid.generateAndSet();

    // Set up the http client to catch the ping we will submit.
    const pingBody = httpClient.waitForPingSubmission("testing");
    // Submit the test ping.
    pings.testing.submit();

    // Validate ping body against the schema.
    const schema = await fetchSchema();
    // Validate the ping against the schema,
    // throws in case errors are found.
    validate(await pingBody, schema, { throwError: true });
  });
});
