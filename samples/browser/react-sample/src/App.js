/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useEffect } from "react";
import "./App.css";
import useGlean from "./glean/useGlean";

function App() {
  const metrics = useGlean();

  useEffect(() => {
    metrics.pageLoad.record();
  }, [metrics]);

  const onButtonClick = () => {
    metrics.buttonClick.record({
      label: "CTA"
    });

    const consoleWarn = document.getElementById("console-warn");
    consoleWarn.classList.add("visible");
  };

  return (
    <div className='main'>
      <button onClick={onButtonClick}>Submit click event!</button>
      <p id='console-warn'>A ping should have been submitted, please check the console for logs.</p>
    </div>
  );
}

export default App;
