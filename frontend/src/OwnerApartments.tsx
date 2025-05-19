import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment } from "./types";
import "./OwnerApartments.css";

const OwnerApartments: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState<boolean>(true); // Stare pentru încărcare
    const [error, setError] = useState<string | null>(null); // Stare pentru erori
    const navigate = useNavigate();
    useEffect(() => {
        if (user?._id && token) { // Verifică user._id și token
            setLoading(true);
            setError(null);
            api.get(`/apartments/by-id/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then((response) => {
                setApartments(response.data);
                setLoading(false);
            }).catch((error) => {
                console.error("Eroare la preluarea apartamentelor:", error);
                setError("Nu s-au putut încărca apartamentele.");
                setLoading(false);
            });
        } else {
            setLoading(false); // Oprește încărcarea dacă nu există user sau token
        }
    }, [user, token]);

    if (loading) {
        return <div className="owner-apartments-container"><p>Se încarcă apartamentele...</p></div>;
    }

    if (error) {
        return <div className="owner-apartments-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="owner-apartments-container">
            {/* <h1>Apartamentele tale</h1> */}
            <div className="apartments-owner-list">
                {apartments.length > 0 ? (
                    apartments.map((apartment) => {
                        // Verifică dacă apartment.images există și este un array cu cel puțin un element
                        const imageUrl = apartment.images && apartment.images.length > 0
                            ? apartment.images[0] // Ia primul URL din array
                            : "/Poze_apartamente/placeholder.jpeg"; // Un placeholder dacă nu există imagini

                        return (
                            <div
                                key={apartment._id}
                                className="apartment-owner-card"
                                style={{ cursor: "pointer" }}           // make it clear it’s clickable
                                onClick={() => navigate(`/owner/apartments/${apartment._id}`)}  // ← navigate on click
                            >
                                <img
                                    src={imageUrl} // Folosește primul URL din Firebase Storage
                                    alt={`Apartament în ${apartment.location}`} // Un alt text mai descriptiv
                                />
                                <p>
                                    <strong>Locație: </strong>
                                    {apartment.location}
                                </p>
                            </div>
                        );
                    })
                ) : (
                    <p>Nu ai apartamente listate momentan.</p>
                )}
            </div>
        </div >
    );
};

export default OwnerApartments;
