# Glean.js - Web extension sample

This sample contains a web extension that will initialize Glean.js when loaded.

Whenever this web extensions popup is opened it will trigger Glean.js events.

> **Note** This sample uses webpack to bundle the Glean.js script with the web extension code.
> This is needed because web extensions can only include files that are stored as children
> of the directory where the manifest file is.

## How to run this sample
Running the example requires Python 3.

1. Link the `@mozilla/glean` package. There is a convenience script for that:

```bash
npm run link:glean
```

2. Build this sample. On this `webext/typescript` folder run:

```bash
npm run build
```

> **Note** This operation will take some time on the first run, because it will create a virtual environment for running the glean-parser.

4. Load the web extension on your browser of choice.

  - **Firefox**
    1. Go to [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox);
    2. Click on `Load Temporary Add-on...`;
    3. Choose the [`manifest.json`](./manifest.json) file;
    4. Click on `Inspect`;
    5. Try clicking on the little Glean logo that should have been added to your browsers toolbar.

  - **Chromium-based browsers**
    1. Go to [chrome://extensions](chrome://extensions);
    2. Click on `Load unpacked`;
    3. Choose this `webext/typescript` folder;
    4. Click on `background page`;
    5. Try clicking on the little Glean logo that should have been added to your browsers toolbar.
