#!/usr/bin/env bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -eo pipefail

WORKSPACE_ROOT="$( cd "$(dirname "$0")/.." ; pwd -P )"

# Get @mozilla/glean current version without the patch version.
# Qt import paths may only have major and minor version.
GLEAN_VERSION=$(node -p -e "require('${WORKSPACE_ROOT}/glean/package.json').version.split('.').reverse().slice(1).reverse().join('.')")

# Create the qmldir file
FILE=glean/dist/qt/org/mozilla/Glean/qmldir
touch "${WORKSPACE_ROOT}/${FILE}"
{
    echo module org.mozilla.Glean
    echo Glean $GLEAN_VERSION glean.js
} >> "${WORKSPACE_ROOT}/${FILE}"

# Add the glean.js file to the final module
cp "${WORKSPACE_ROOT}/glean/src/index/qt.js" "${WORKSPACE_ROOT}/glean/dist/qt/org/mozilla/Glean/glean.js"
