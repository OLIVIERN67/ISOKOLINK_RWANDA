import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
