# Continuous Integration

This repository runs multiple checks on each PR to ensure code quality.
[CircleCI](https://circleci.com/) is the chosen tool for running these jobs.

> ⚠️ **Important** ⚠️
>
> When adding a new CI job that requires access to secrets, **do not** add these secrets
> as environment variables to the Glean.js CircleCI  project. Instead, add them to the
> `data-eng-gleanjs-gh` [restricted context](https://circleci.com/docs/2.0/contexts/)
> and require approval for running the job that needs them. Use the `check-size` job as
> a model for this pattern.
>
> This is very important because "Pass environment variables to forks" is turned on
> for the Glean.js CircleCI project and any environment variable added to it will be
> available to any fork unrestricted. Note that this will also share SSH keys with forks,
> prefer adding such keys as environment variables to the restricted context as well.
>
> Finally, note that jobs that will not ever be run on forks do not need approval, as they
> already can access the restricted context.

## Jobs

### `spellchecks`

Run a spellchecker on all Markdown files in this repository.

### `lint`

Runs all necessary lints on the code. This includes:

- Usual JavaScript linting using `eslint`;
- Checking if the PR does not introduce circular dependencies to the `@mozilla/glean` library;
- Checking if the `package-lock.json` file is up to date.

### `test`

Runs unit and integration test on the `@mozilla/glean` library.

### `check-size`

_Requires approval_.

This job builds a size comparison report between the size of the library in the current
PR vs. the size of the library in the `main` branch. The purpose of this job is to keep
us in check related to the size of the final Glean.js bundle.

It is left to the discretion of each reviewer to approve this job or not.

This job does not run for on the `release`, `release-.*` and `main` branches.

### `browser-compat-smoke-tests`

_Only runs on the `release`, `release-.*` and `main` branches._

This job runs a smoke test for the Glean JavaScript SDK on websites. The same test is run
on Firefox, Chrome, Safari and Edge. For each we run the test both on their latest version
and the minimum supported version.

We use [BrowserStack](https://www.browserstack.com/) to access all of these different browser versions easily.

### `docs-deploy`

_Only runs on the `release`, `release-.*` and `main` branches._

This job builds and deploys the Glean.js documentation in the `/documentation` folder. The documentation is published at: [https://mozilla.github.io/glean.js/](https://mozilla.github.io/glean.js/).

### `publish`

_Only runs when a new tag is created._

This jobs builds and deploys the Glean.js library, both to npm as the `@mozilla/glean` package
and as an asset on the GitHub release page.

