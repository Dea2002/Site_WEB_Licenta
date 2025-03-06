// frontend/src/OwnerApartments.tsx
// Lista cu apartamentele proprietarului care este autentificat
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import { Apartment } from "./types";
import "./OwnerApartments.css";

const OwnerApartments: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartments, setApartments] = useState<Apartment[]>([]);

    useEffect(() => {
        if (user?.email) {
            axios
                .get(`http://localhost:5000/apartments/by-email/${user.email}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((response) => {
                    setApartments(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea apartamentelor:", error);
                });
        }
    }, [user, token]);

    return (
        <div className="owner-apartments-container">
            <Bara_nav_OwnerDashboard />
            {/* <h1>Apartamentele tale</h1> */}
            <div className="apartments-list">
                {apartments.length > 0 ? (
                    apartments.map((apartment) => (
                        <div key={apartment._id} className="apartment-card">
                            <h2>{apartment.name}</h2>
                            <p>{apartment.location}</p>
                            <p>{apartment.description}</p>
                            {/* Poți adăuga alte detalii după necesitate */}
                        </div>
                    ))
                ) : (
                    <p>Nu ai apartamente listate momentan.</p>
                )}
            </div>
        </div>
    );
};

export default OwnerApartments;
