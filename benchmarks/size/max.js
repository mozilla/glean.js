/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// GLEAN will be conditoned on the PLATFORM environment variable.
// Check `./webpack.config.js` for more info.
import Glean from "GLEAN";
// Metrics
import BooleanMetricType from "@mozilla/glean/private/metrics/boolean";
import CounterMetricType from "@mozilla/glean/private/metrics/counter";
import DatetimeMetricType from "@mozilla/glean/private/metrics/datetime";
import EventMetricType from "@mozilla/glean/private/metrics/event";
import LabeledMetricType from "@mozilla/glean/private/metrics/labeled";
import QuantityMetricType from "@mozilla/glean/private/metrics/quantity";
import StringMetricType from "@mozilla/glean/private/metrics/string";
import TextMetricType from "@mozilla/glean/private/metrics/text";
import TimespanMetricType from "@mozilla/glean/private/metrics/timespan";
import RateMetricType from "@mozilla/glean/private/metrics/rate";
import UUIDMetricType from "@mozilla/glean/private/metrics/uuid";
import URLMetricType from "@mozilla/glean/private/metrics/url";
// Plugins
import PingEncryptionPlugin from "@mozilla/glean/plugins/encryption";

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
  JSON.stringify(TextMetricType),
  JSON.stringify(TimespanMetricType),
  JSON.stringify(RateMetricType),
  JSON.stringify(UUIDMetricType),
  JSON.stringify(URLMetricType),
  JSON.stringify(PingEncryptionPlugin),
);
