/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ErrorType } from "../core/error/error_type.js";

import platform from "../platform/qt/index.js";
import base from "./base.js";

// Private Glean types to export.
import PingType from "../core/pings/ping_type.js";
import BooleanMetricType from "../core/metrics/types/boolean.js";
import CounterMetricType from "../core/metrics/types/counter.js";
import DatetimeMetricType from "../core/metrics/types/datetime.js";
import EventMetricType from "../core/metrics/types/event.js";
import LabeledMetricType from "../core/metrics/types/labeled.js";
import QuantityMetricType from "../core/metrics/types/quantity.js";
import StringMetricType from "../core/metrics/types/string.js";
import StringListMetricType from "../core/metrics/types/string_list.js";
import TextMetricType from "../core/metrics/types/text.js";
import TimespanMetricType from "../core/metrics/types/timespan.js";
import UUIDMetricType from "../core/metrics/types/uuid.js";
import URLMetricType from "../core/metrics/types/url.js";

export default {
  ...base(platform),

  ErrorType,

  _private: {
    PingType,
    BooleanMetricType,
    CounterMetricType,
    DatetimeMetricType,
    EventMetricType,
    LabeledMetricType,
    QuantityMetricType,
    StringMetricType,
    StringListMetricType,
    TimespanMetricType,
    TextMetricType,
    UUIDMetricType,
    URLMetricType
  }
};
