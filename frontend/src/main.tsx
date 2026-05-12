import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeModeProvider>
    <App />
  </ThemeModeProvider>,
);
