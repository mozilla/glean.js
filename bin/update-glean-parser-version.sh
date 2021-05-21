#!/usr/bin/env bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Update the glean_parser version

set -eo pipefail

run() {
    [ "${VERB:-0}" != 0 ] && echo "+ $*"
    "$@"
}

# All sed commands below work with either
# GNU sed (standard on Linux distrubtions) or BSD sed (standard on macOS)
SED="sed"

WORKSPACE_ROOT="$( cd "$(dirname "$0")/.." ; pwd -P )"

if [ -z "$1" ]; then
    echo "Usage: $(basename "$0") <new version>"
    echo
    echo "Update the glean_parser version"
    exit 1
fi

NEW_VERSION="$1"

# GIT_STATUS_OUTPUT=$(git status --untracked-files=no --porcelain)
# if [ -z "$ALLOW_DIRTY" ] && [ -n "${GIT_STATUS_OUTPUT}" ]; then
#     lines=$(echo "$GIT_STATUS_OUTPUT" | wc -l | tr -d '[:space:]')
#     echo "error: ${lines} files in the working directory contain changes that were not yet committed into git:"
#     echo
#     echo "${GIT_STATUS_OUTPUT}"
#     echo
#     exit 1
# fi

# Update the version in glean/src/cli.ts
FILE=glean/src/cli.ts
run $SED -i.bak -E \
    -e "s/const GLEAN_PARSER_VERSION = \"[0-9.]+\"/const GLEAN_PARSER_VERSION = \"${NEW_VERSION}\"/" \
    "${WORKSPACE_ROOT}/${FILE}"
run rm "${WORKSPACE_ROOT}/${FILE}.bak"

# Update the version in samples/qt-qml-app/requirements.txt
FILE=samples/qt-qml-app/requirements.txt
run $SED -i.bak -E \
    -e "s/glean_parser==[0-9.]+/glean_parser==${NEW_VERSION}/" \
    "${WORKSPACE_ROOT}/${FILE}"
run rm "${WORKSPACE_ROOT}/${FILE}.bak"

echo "glean_parser updated to v${NEW_VERSION}"
echo
echo "Changed files:"
git status --untracked-files=no --porcelain || true
echo
echo "Create update commit v${NEW_VERSION} now? [y/N]"
read -r RESP
echo
if [ "$RESP" != "y" ] && [ "$RESP" != "Y" ]; then
    echo "No new commit. No new tag. Proceed manually."
    exit 0
fi

run git add --update "${WORKSPACE_ROOT}"
run git commit --message "Bumped glean_parser version to ${NEW_VERSION}"

if git remote | grep -q upstream; then
    remote=upstream
else
    remote=origin
fi
branch=$(git rev-parse --abbrev-ref HEAD)

echo "Don't forget to push this commit:"
echo
echo "    git push $remote $branch"

