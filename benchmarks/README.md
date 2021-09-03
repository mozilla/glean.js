# Glean.js size benchmarks

Compare the size of the different Glean bundles across the local `main` branch and the current checkout.

## How to run

To run a local report:

```
npm run size:report:dry
```

To run the report and post the results to a GitHub pull request:

```
npm run size:report
```

_Note: This requires a `GITHUB_TOKEN` and the CircleCI environment to know which PR to post to._
