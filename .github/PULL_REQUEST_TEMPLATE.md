### Pull Request checklist ###
<!-- Before submitting the PR, please address each item -->
- [ ] **Quality**: Make sure this PR builds and runs cleanly.
  - Inside the `glean/folder`, run:
    - `npm run test` Runs _all_ tests
    - `npm run lint && npm run lint:circular-deps` Runs _all_ linters
- [ ] **Tests**: This PR includes thorough tests or an explanation of why it does not
- [ ] **Changelog**: This PR includes a changelog entry to `CHANGELOG.md` or an explanation of why it does not need one
- [ ] **Documentation**: This PR includes documentation changes, an explanation of why it does not need that or a follow-up bug has been filed to do that work
  - Documentation should be added to [The Glean Book](https://mozilla.github.io/glean/book/index.html) when making changes to Glean's user facing API
    - When changes to the Glean Book are necessary, link to the corresponding PR on the [`mozilla/glean`](https://github.com/mozilla/glean) repository
  - Documentation should be added to [the Glean.js developer documentation](https://github.com/mozilla/glean.js/tree/main/docs) when making internal code changes
