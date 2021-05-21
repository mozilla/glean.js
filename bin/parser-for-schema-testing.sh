#!/usr/bin/env bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# We are assuming this script is run inside the glean/ folder.

# Generate files using the Glean.js CLI tool (which just runs glean_parser)
npm run glean-internal -- \
  translate tests/integration/schema/metrics.yaml tests/integration/schema/pings.yaml \
  -f typescript \
  -o tests/integration/schema/generated

# Update metrics import path
sed -rli '' 's#@mozilla/glean/webext/private/metrics#../../../../src/core/metrics/types#g' tests/integration/schema/generated/forTesting.ts
# Update ping import path
sed -rli '' 's#@mozilla/glean/webext/private/ping#../../../../src/core/pings/ping_type.js#g' tests/integration/schema/generated/pings.ts

