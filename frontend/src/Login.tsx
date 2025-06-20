import React, { useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import jwt_decode from 'jwt-decode';
const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login, loginFaculty } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { email, password };
            const response = await api.post("/auth/login", payload);

            const { token } = response.data;

            const decoded: any = jwt_decode<{ iat: number; exp: number }>(token);
            if (decoded.role === "facultate") {
                loginFaculty(token, decoded);
            } else {
                login(token, decoded);
            }

            if (decoded.role === "admin") {
                navigate("/admin/dashboard");
            } else if (decoded.role === "proprietar") {
                navigate("/owner-dashboard");
            } else if (decoded.role === "facultate") {
                navigate("/faculty_dashboard")
            } else if (decoded.role === "student") {
                navigate("/home");
            }
        } catch (err) {
            setError("Email sau parola incorecte");
        }
    };

    return (
        <>
            <div className="login-container">
                <h1> Autentificare</h1>
                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Parola:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit">Logheaza-te</button>
                </form>
                <p>
                    Nu ai un cont?{" "}
                    <Link to="/register" className="custom-link">
                        Inregistreaza-te
                    </Link>
                </p>
            </div>
        </>
    );
};

export default Login;