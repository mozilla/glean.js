# Glean.js release process

Glean.js is released in the [`@mozilla/glean`](https://www.npmjs.com/package/@mozilla/glean) npm package.

That package will contain sub packages with Glean.js builds for each environment supported.

The development & release process roughly follows the [Git Flow model](https://nvie.com/posts/a-successful-git-branching-model/).

> **Note**: The rest of this section assumes that `upstream` points to the `https://github.com/mozilla/glean.js` repository, while `origin` points to the developer fork. For some developer workflows, `upstream` can be the same as `origin`.

## Standard release

Releases can only be done by one of the Glean maintainers.

- Main development branch: `main`
- Main release branch: `release`
- Specific release branch: `release-vX.Y.Z`

### Create a release branch

1. Create a release branch from the `main` branch:
    ```
    git checkout -b release-v25.0.0 main
    ```
2. Update the changelog .
    1. Add any missing important changes under the `Unreleased changes` headline.
    2. Commit any changes to the changelog file due to the previous step.
3. Run `bin/prepare-release.sh <new version>` to bump the version number.
    1. The new version should be the next patch, minor or major version of what is currently released.
    2. Let it create a commit for you.
4. Push the new release branch:
    ```
    git push upstream release-v25.0.0
    ```
5. Wait for CI to finish on that branch and ensure it's green:
    * <https://circleci.com/gh/mozilla/glean.js/tree/release-v25.0.0>
6. Apply additional commits for bug fixes to this branch.
    * Adding large new features here is strictly prohibited. They need to go to the `main` branch and wait for the next release.

### Finish a release branch

When CI has finished and is green for your specific release branch, you are ready to cut a release.

1. Check out the main release branch:
    ```
    git checkout release
    ```
2. Merge the specific release branch:
    ```
    git merge --no-ff release-v25.0.0
    ```
3. Push the main release branch:
    ```
    git push upstream release
    ```
4. Tag the release on GitHub:
    1. [Draft a New Release](https://github.com/mozilla/glean.js/releases/new) in the GitHub UI (`Releases > Draft a New Release`).
    2. Enter `v<myversion>` as the tag. It's important this is the same as the version you specified to the `prepare_release.sh` script, with the `v` prefix added.
    3. Select the `release` branch as the target.
     4. Under the description, paste the contents of the release notes from `CHANGELOG.md`.
5. Wait for the CI build to complete for the tag.
    * You can check [on CircleCI for the running build](https://circleci.com/gh/mozilla/glean.js).
6. Send a pull request to merge back the specific release branch to the development branch: <https://github.com/mozilla/glean.js/compare/main...release-v25.0.0?expand=1>
    * This is important so that no changes are lost.
    * This might have merge conflicts with the `main` branch, which you need to fix before it is merged.
7. Once the above pull request lands, delete the specific release branch.
