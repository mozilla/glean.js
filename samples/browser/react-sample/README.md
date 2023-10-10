# Glean.js - sample react app (based on create-react-app)

This sample contains a SPA react app created from the `create-react-app` template. Glean will be initialized on first load.

## How to run this sample

Running this sample requires Python 3.

1. Install dependencies

```bash
npm install
```

2. Link the `@mozilla/glean` package. There is a convenience script for that:

```bash
npm run link:glean
```

3. Generate the metrics API from the bundled `metrics.yaml` file. This will produce JavaScript files in `src/glean/generated`:

```bash
npm run build:glean
```

4. Run the sample project (runs on http://localhost:3000)

```bash
npm start
```
