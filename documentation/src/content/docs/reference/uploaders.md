---
title: Uploaders
description: How uploaders work in Glean.js.
---

## uploadEnabled

This value controls whether or not Glean will upload pings. You can set
this value two different ways:

- During initialization (as the second parameter): `Glean.initialize("app-name", true);`
- Programmatically, while the app is running: `Glean.setUploadEnabled(false);`

## Uploaders

### sendbeacon_fallback

**The default uploader used by Glean.js.**

This uploader tries to use `sendBeacon`
first. If the API call fails or `sendBeacon` isn't available, Glean.js will
try and use the `fetch` uploader instead.

### sendBeacon

The preferred uploader of Glean.js. Using `sendBeacon` allows us to more
accurately trigger API calls whenever pages are unloading.

### fetch

Glean.js will automatically use the `fetch` API whenever debug
values are set. Debug Tags and Source Tags are sent through custom headers,
which isn't possible using `sendBeacon`.


### Configuring a custom uploader

You are able to configure a custom uploader in Glean.js.

#### Custom uploader

```js
import Glean from '@mozilla/glean/<platform>';
import { Uploader, UploadResult, UploadResultStatus } from '@mozilla/glean/uploader';

/**
 * My custom uploader implementation
 */
export class MyCustomUploader extends Uploader {
  async post(url: string, body: string, headers): Promise<UploadResult> {
    // My custom POST request code
  }
}

Glean.initialize(
  'my-app-id',
  // Here, `isTelemetryEnabled` is a method to get user preferences specific to
  // your application, and not part of the Glean API.
  isTelemetryEnabled(),
  {
    httpClient: new MyCustomUploader()
  }
);
```

#### Glean.js pre-configured uploader

```js
import { BrowserSendBeaconUploader } from '@mozilla/glean/web';

Glean.initialize(
  'my-app-id',
  isTelemetryEnabled(),
  {
    httpClient: BrowserSendBeaconUploader
  }
);
```

## Further reading

- <a href="https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon" target="_blank">sendBeacon</a>
- <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">fetch</a>
