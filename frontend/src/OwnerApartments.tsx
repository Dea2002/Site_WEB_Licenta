import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment } from "./types";
import "./OwnerApartments.css";

const OwnerApartments: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    useEffect(() => {
        if (user?._id && token) {
            setLoading(true);
            setError(null);
            api.get(`/apartments/by-id/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then((response) => {
                setApartments(response.data);
                setLoading(false);
            }).catch((error) => {
                console.error("Eroare la preluarea apartamentelor:", error);
                setError("Nu s-au putut incarca apartamentele.");
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [user, token]);

    if (loading) {
        return <div className="owner-apartments-container"><p>Se incarca apartamentele...</p></div>;
    }

    if (error) {
        return <div className="owner-apartments-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="owner-apartments-container">
            <div className="apartments-owner-list">
                {apartments.length > 0 ? (
                    apartments.map((apartment) => {
                        const imageUrl = apartment.images && apartment.images.length > 0
                            ? apartment.images[0] // Ia primul URL din array
                            : "/Poze_apartamente/placeholder.png"; // Un placeholder daca nu exista imagini

                        return (
                            <div
                                key={apartment._id}
                                className="apartment-owner-card"
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/owner/apartments/${apartment._id}`)}
                            >
                                <img
                                    src={imageUrl} // Foloseste primul URL din Firebase Storage
                                    alt={`Apartament in ${apartment.location}`}
                                />
                                <p>
                                    <strong>Locatie: </strong>
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
