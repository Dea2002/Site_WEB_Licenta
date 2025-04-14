// frontend/src/Login.tsx
import React, { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Bara_navigatie from "./Bara_navigatie";
import "./Login.css";

const Login: React.FC = () => {
    const [email, setEmail] = useState(""); // Schimbat de la 'username' la 'email'
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || "/";

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     try {
    //         const response = await axios.post("http://localhost:5000/auth/login", {
    //             email,
    //             password,
    //         }); // Schimbat de la 'username' la 'email'
    //         console.log(response.data);
    //         login(response.data.token);
    //         if (response.data.role == "admin") {
    //             navigate("/admin/dashboard");
    //         } else navigate(from, { replace: true });
    //     } catch (err) {
    //         setError("Email sau parola incorecte");
    //     }
    // };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/auth/login", {
                email,
                password,
            });
            console.log(response.data);
            login(response.data.token);
            if (response.data.role === "admin") {
                navigate("/admin/dashboard");
            } else if (response.data.role === "proprietar") {
                navigate("/owner-dashboard");
            } else {
                navigate(from, { replace: true });
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
