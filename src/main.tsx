import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMobilePlugins } from "./capacitor.ts";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

initMobilePlugins();

createRoot(document.getElementById("root")!).render(<App />);
