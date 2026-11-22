import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./auth.jsx";
import Cursor from "./fx/Cursor.jsx";
import { MotionProvider } from "./fx/motion.jsx";
import { ToastProvider, ConfirmProvider } from "./ui.jsx";
import "./styles/theme.css";
import "./styles/app.css";
import "./styles/sketch.css";
import "./styles/pages.css";

// "Reduce motion" is remembered, so the very first paint already respects it (the MotionProvider keeps it in step afterwards).
try {
  if (localStorage.getItem("statskill.reduceMotion") === "1") {
    document.documentElement.dataset.reduceMotion = "true";
  }
} catch {
  /* storage can be blocked; the page still works */
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
      <Cursor />
    </MotionProvider>
  </React.StrictMode>
);
