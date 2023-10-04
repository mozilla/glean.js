import { useEffect } from "react";

import Glean from "@mozilla/glean/web";
import * as metrics from "./generated/appEvents";

const useGlean = () => {
  useEffect(() => {
    const APP_NAME = "glean-react-sample";

    Glean.setLogPings(true);
    Glean.setDebugViewTag(APP_NAME);

    Glean.initialize(APP_NAME, true, {
      maxEvents: 1
    });
  }, []);

  return metrics;
};

export default useGlean;
