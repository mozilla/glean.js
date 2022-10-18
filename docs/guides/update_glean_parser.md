# Updating the glean_parser version

To update the version of glean_parser used by the Glean.js, run the `bin/update-glean-parser-version.sh` script, providing the version as a command line parameter:

```bash
bin/update-glean-parser-version.sh 1.28.3
```

This will update the version in all the required places and create a commit with the changes. After that, you just need to create a pull request with the changes.

No further action is required.
