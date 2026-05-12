import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/common/ToastProvider";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeModeProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </ThemeModeProvider>,
);
