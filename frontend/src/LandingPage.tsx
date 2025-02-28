// frontend/src/LandingPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Navigam catre pagina Home si trecem parametrul de query "location"
        navigate(`/home?location=${encodeURIComponent(search)}`);
    };

    // Handler pentru butonul "Lista cu apartamentele" (navigheaza fara filtre)
    const handleListAll = () => {
        navigate("/home");
    };

    return (
        <div className="landing-page">
            <div className="landing-content">
                <div className="card_titlu">
                    <h1 className="text-wave">
                        {"Apartamente pentru inchiriere".split("").map((char, index) => {
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
                    {/* <label htmlFor="location">Cauta dupa locatie:</label> */}
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
                {/* Buton suplimentar pentru afisarea tuturor apartamentelor */}
                <button onClick={handleListAll} className="list-all-button">
                    Lista cu apartamentele
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
