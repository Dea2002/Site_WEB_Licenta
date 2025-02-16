// frontend/src/LandingPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

const LandingPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Navigam catre pagina Home si trecem parametrul de query "location"
        navigate(`/home?location=${encodeURIComponent(search)}`);
    };

    // Handler pentru butonul "Lista cu apartamentele" (navigheaza fara filtre)
    const handleListAll = () => {
        navigate('/home');
    };

    return (
        <div className="landing-page">
            <div className="landing-content">
                <div className="card_titlu wave-container">
                    <h1 className="wave-text">
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
                                        style={{ animationDelay: `${index * 0.1}s` }}
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
                    <input
                        type="text"
                        id="location"
                        placeholder="Cauta dupa locatie"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
