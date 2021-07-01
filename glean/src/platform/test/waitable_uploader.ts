import Uploader, { UploadResult, UploadResultStatus } from "../../core/upload/uploader";
import { JSONObject } from "../../core/utils";
import { unzipPingPayload } from "../../../tests/utils";

/**
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
class WaitableUploader implements Uploader {
  private waitingForName?: string;
  private waitingForPath? : string;
  private waitResolver?: (pingBody: JSONObject) => void;

  /**
   * Returns a promise that resolves once a ping is submitted or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   * @param path
   * @returns A promise that resolves once a ping is submitted or times out after a 2s wait.
   */
  waitForPingSubmission(name: string, path?: string): Promise<JSONObject> {
    this.waitingForName = name;
    this.waitingForPath = path;
    return new Promise<JSONObject>((resolve, reject) => {
      this.waitResolver = (pingBody: JSONObject) => {
        this.waitingForName = undefined;
        this.waitingForPath = undefined;
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(pingBody, null, 2));
        resolve(pingBody);
      };

      setTimeout(() => reject(), 2000);
    });
  }

  post(url: string, body: string): Promise<UploadResult> {
    if (this.waitingForPath) {
      if (url.includes(this.waitingForPath)) {
        this.waitResolver?.(unzipPingPayload(body));
      } else {
        return Promise.reject(new Error('The submitted ping is not from the url we are waiting for.'));
      }
    } else if (this.waitingForName && url.includes(this.waitingForName)) {
      this.waitResolver?.(unzipPingPayload(body));
    }

    return Promise.resolve({
      result: UploadResultStatus.Success,
      status: 200
    });
  }
}

export default WaitableUploader