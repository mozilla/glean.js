/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "@mozilla/glean/webext";
// Metrics
import BooleanMetricType from "@mozilla/glean/webext/private/metrics/boolean";
import CounterMetricType from "@mozilla/glean/webext/private/metrics/counter";
import DatetimeMetricType from "@mozilla/glean/webext/private/metrics/datetime";
import EventMetricType from "@mozilla/glean/webext/private/metrics/event";
import LabeledMetricType from "@mozilla/glean/webext/private/metrics/labeled";
import QuantityMetricType from "@mozilla/glean/webext/private/metrics/quantity";
import StringMetricType from "@mozilla/glean/webext/private/metrics/string";
import TimespanMetricType from "@mozilla/glean/webext/private/metrics/timespan";
import UUIDMetricType from "@mozilla/glean/webext/private/metrics/uuid";
// Plugins
import PingEncryptionPlugin from "@mozilla/glean/webext/plugins/encryption";

// We import everything and log it, so that we are sure all imports are used
// and webpack is required to actually include them in the final bundle.
console.log(
  JSON.stringify(Glean),
  JSON.stringify(BooleanMetricType),
  JSON.stringify(CounterMetricType),
  JSON.stringify(DatetimeMetricType),
  JSON.stringify(EventMetricType),
  JSON.stringify(LabeledMetricType),
  JSON.stringify(QuantityMetricType),
  JSON.stringify(StringMetricType),
  JSON.stringify(TimespanMetricType),
  JSON.stringify(UUIDMetricType),
  JSON.stringify(PingEncryptionPlugin),
);
