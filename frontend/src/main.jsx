import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { CompanyProvider } from "./context/CompanyContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CompanyProvider>
      <App />
    </CompanyProvider>
  </React.StrictMode>
);