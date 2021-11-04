# Glean.js - Static web app sample

This sample contains a static web app that will initialize Glean.js when loaded.

The app will display a button that when clicked should trigger Glean.js events.

## How to run this sample

Running the example requires Python 3.

1. Install dependencies.

```
npm install
```

2. Link the `@mozilla/glean` package. There is a convenience script for that:

```bash
npm run link:glean
```

3. Run this sample. On this `web/` folder run:

```bash
npm run dev
```

> **Note** This operation will take some time on the first run, because it will create a virtual environment for running the glean-parser.
