import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { SettingsProvider } from "./context/SettingsContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </AuthProvider>
);
