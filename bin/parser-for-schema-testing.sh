#!/usr/bin/env bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -eo pipefail

run() {
    [ "${VERB:-0}" != 0 ] && echo "+ $*"
    "$@"
}

# All sed commands below work with either
# GNU sed (standard on Linux distrubtions) or BSD sed (standard on macOS)
SED="sed"

WORKSPACE_ROOT="$( cd "$(dirname "$0")/.." ; pwd -P )"

# Generate files using the Glean.js CLI tool (which just runs glean_parser)
npm run cli -- \
  translate tests/integration/schema/metrics.yaml tests/integration/schema/pings.yaml \
  -f typescript \
  -o tests/integration/schema/generated

# Update metrics import path
FILE=glean/tests/integration/schema/generated/forTesting.ts
run $SED -i.bak -E \
  -e 's#@mozilla/glean/private/metrics#../../../../src/core/metrics/types#g' \
  "${WORKSPACE_ROOT}/${FILE}"
run rm "${WORKSPACE_ROOT}/${FILE}.bak"

# Update ping import path
FILE=glean/tests/integration/schema/generated/pings.ts
run $SED -i.bak -E \
 -e 's#@mozilla/glean/private/ping#../../../../src/core/pings/ping_type.js#g' \
 "${WORKSPACE_ROOT}/${FILE}"
run rm "${WORKSPACE_ROOT}/${FILE}.bak"

