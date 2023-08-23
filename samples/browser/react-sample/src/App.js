import "./App.css";
import { buttonClick } from "./glean/generated/appEvents";

function App() {
  const onButtonClick = () => {
    buttonClick.record({
      label: "CTA"
    });

    const consoleWarn = document.getElementById("console-warn");
    consoleWarn.classList.add("visible");
  };

  return (
    <div className="main">
      <button onClick={onButtonClick}>Submit click event!</button>
      <p id='console-warn'>A ping should have been submitted, please check the console for logs.</p>
    </div>
  );
}

export default App;
