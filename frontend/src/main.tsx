import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./authenticate/AuthContext";
import "./style.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
    <React.StrictMode>
        <Router>
            <AuthProvider>
                {" "}
                <App />
            </AuthProvider>
        </Router>
    </React.StrictMode>,
);

