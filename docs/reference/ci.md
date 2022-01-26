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

### `lint`

Runs all necessary lints on the code. This includes:

- Usual JavaScript linting using `eslint`;
- Checking if the PR does not introduce circular dependencies to the `@mozilla/glean` library;
- Checking if the `package-lock.json` file is up to date.

### `test`

Runs unit and integration test on the `@mozilla/glean` library.

### `samples-tests`

Runs unit tests on the Glean.js sample apps.

### `check-size`

_Requires approval_.

This job builds a size comparison report between the size of the library in the current
PR vs. the size of the library in the `main` branch. The purpose of this job is to keep
us in check related to the size of the final Glean.js bundle.

It is left to the discretion of each reviewer to approve this job or not.

### `check-qt-js`

This is a rudimentary check to make sure the Glean.js Qt/QML bundle cleanly loads in QML
environments. The QML JavaScript environment contains a few particularities unusual to
JavaScript developers and the purpose of this job is to make sure new changes to Glean.js
do not fail for these corner cases.

### `docs-deploy`

_Only runs when a new tag is created._

This job builds and deploys the Glean.js documentation generated from JSDoc comments in the code.
The documentation is published at: [https://mozilla.github.io/glean.js/](https://mozilla.github.io/glean.js/)

### `publish`

_Only runs when a new tag is created._

This jobs builds and deploys the Glean.js library, both to npm as the `@mozilla/glean` package
and as an asset on the GitHub release page.

