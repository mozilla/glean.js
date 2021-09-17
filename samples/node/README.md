# Glean.js - Node.js sample

This sample contains a Node.js script that will initialize Glean.js when called.

Whenever this script is invoked Glean is initialized,
a Datetime metric is recorded and a ping is sent.

## How to run this sample

Running the example requires Python 3.

1. Link the `@mozilla/glean` package. There is a convenience script for that:

```bash
npm run link:glean
```

2. Generate metrics and pings code.

```bash
npm run glean
```

> **Note** This operation will take some time on the first run, because it will create a virtual environment for running the glean-parser.

3. Run the sample script.

```bash
npm run exec
```
