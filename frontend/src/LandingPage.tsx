import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/home?location=${encodeURIComponent(search)}`);
    };

    const handleListAll = () => {
        navigate("/home");
    };

    const handleLoginRedirect = () => {
        navigate("/login");
    };

    return (
        <div className="landing-page">
            <div className="landing-content">
                <div className="card_titlu">
                    <h1 className="text-wave">
                        {"Student Rent".split("").map((char, index) => {
                            if (char === " ") {
                                return (
                                    <span key={index} style={{ display: "inline-block" }}>
                                        &nbsp;
                                    </span>
                                );
                            } else {
                                return (
                                    <span
                                        key={index}
                                        style={{
                                            animationDelay: `${index * 0.1}s`,
                                        }}
                                    >
                                        {char}
                                    </span>
                                );
                            }
                        })}
                    </h1>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="search-container">
                        <input
                            type="text"
                            id="location"
                            placeholder="Cauta dupa locatie"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <button type="submit">Cauta</button>
                </form>

                <div className="button-group">
                    <button
                        onClick={handleListAll}
                        className="landing-action-button list-all-button"
                    >
                        Lista cu apartamentele
                    </button>

                    <button
                        onClick={handleLoginRedirect}
                        className="landing-action-button login-button"
                    >
                        Autentificare
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;