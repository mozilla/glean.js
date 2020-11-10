# Glean.js - Web extension sample

This sample contains a webextension that will initialize Glean.js when loaded.

Whenever this webextensions popup is opened it will trigger Glean.js events.

## How to run this sample

1. Build Glean.js for the browser. On the root folder of this repository run:

```bash
npm run build:browser
```

2. Build this sample. On this `web-extension` folder run:

```bash
npm install
npm run build
```

3. Load the web extension on your browser of choice.

  - **Firefox**
    1. Go to [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox);
    2. Click on `Load Temporary Add-on...`;
    3. Choose the [`manifest.json`](./manifest.json) file;
    4. Click on `Inspect`;
    5. Try clicking on the little Glean logo that should have been added to your browsers toolbar.

  - **Chrome**
    1. Go to [chrome://extensions](chrome://extensions);
    2. Click on `Load unpacked`;
    3. Choose this `web-extension` folder;
    4. Click on `background page`;
    5. Try clicking on the little Glean logo that should have been added to your browsers toolbar.
