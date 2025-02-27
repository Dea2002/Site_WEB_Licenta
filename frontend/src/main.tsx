// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./AuthContext"; // Importa AuthProvider
import "./style.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
    <React.StrictMode>
        <Router>
            <AuthProvider>
                {" "}
                {/* inveleste aplicatia cu AuthProvider */}
                <App />
            </AuthProvider>
        </Router>
    </React.StrictMode>,
);

