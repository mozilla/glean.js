# Glean.js - Web extension sample

This sample contains a web extension that will initialize Glean.js when loaded.

Whenever this web extensions popup is opened it will trigger Glean.js events.

> **Note** This sample uses webpack to bundle the Glean.js script with the web extension code.
> This is needed because web extensions can only include files that are stored as children
> of the directory where the manifest file is.

## How to run this sample

1. Build Glean.js for web extensions. On the root folder of this repository run:

```bash
npm run build:webext
```

2. Generate metrics and pings files.

```bash
npm run glean_parser
```

> This command requires that you have [`glean_parser`](https://pypi.org/project/glean-parser/) available.
> glean_parser is a Python package. To install it run `pip install glean_parser`.
> Javascript support was added to glean_parser on version 2.1.0, make sure your version is up to date.


3. Build this sample. On this `web-extension` folder run:

```bash
npm install
npm run build
```

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
    3. Choose this `web-extension` folder;
    4. Click on `background page`;
    5. Try clicking on the little Glean logo that should have been added to your browsers toolbar.
