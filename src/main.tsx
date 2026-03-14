import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMobilePlugins } from "./capacitor.ts";

initMobilePlugins();

createRoot(document.getElementById("root")!).render(<App />);
