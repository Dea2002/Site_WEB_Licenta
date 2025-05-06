import React, { useState, useContext } from "react";
import axios from "axios";
import { AuthContext, User } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Bara_navigatie from "./NavBars/Bara_navigatie";
import "./Login.css";
import jwt_decode from 'jwt-decode';

const Login: React.FC = () => {
    const [email, setEmail] = useState(""); // Schimbat de la 'username' la 'email'
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login, loginFaculty } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { email, password };
            const response = await axios.post("http://localhost:5000/auth/login", payload);

            const { token } = response.data;

            // stochez token-ul si user-ul in context
            const decoded: any = jwt_decode<{ iat: number; exp: number }>(token);
            if (decoded.role === "facultate") {
                loginFaculty(token, decoded);
            } else {
                login(token, decoded);
            }

            // redirect in functie de rol
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
            <Bara_navigatie />
            <div className="login-container">
                <h1> Autentificare</h1>
                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <label>Email:</label> {/* Schimbat de la 'Username' la 'Email' */}
                        <input
                            type="email" // Schimbat tipul la 'email' pentru a facilita validarea
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
