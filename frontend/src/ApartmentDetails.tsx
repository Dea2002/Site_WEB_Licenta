import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Apartment } from "./types";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import Login from "./Login";
import "./ApartmentDetails.css";
import OwnerPop_up from "./OwnerPop_up";

const ApartmentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();

    // Stare pentru afișarea modalului
    const [showOwnerPop_up, setshowOwnerPop_up] = useState(false);

    useEffect(() => {
        if (id) {
            axios
                .get<Apartment>(`http://localhost:5000/apartments/${id}`)
                .then((response) => {
                    setApartment(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", error);
                    setError("Apartamentul nu a fost gasit.");
                });
        }
    }, [id]);

    useEffect(() => {
        if (showOwnerPop_up) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showOwnerPop_up]);

    const handleReserve = () => {
        if (isAuthenticated) {
            navigate("/confirmation", { state: { apartmentId: id } });
        } else {
            navigate("/login", { state: { from: `/apartment/${id}` } });
        }
    };

    if (error) {
        return (
            <div>
                <Bara_navigatie />
                <p className="error">{error}</p>
            </div>
        );
    }

    if (!apartment) {
        return (
            <div>
                <Bara_navigatie />
                <p>Se incarca detaliile apartamentului...</p>
            </div>
        );
    }

    return (
        <div className="apartment-details-page">
            <Bara_navigatie />
            {/* <h1>Detalii Apartament</h1> */}

            <div className="details-container">
                {/* Partea stanga */}
                <div className="left-section">
                    {/* Imaginea apartamentului */}
                    <div className="image-container">
                        {apartment.image && (
                            <img
                                src={`/Poze_apartamente/${apartment.image}`}
                                alt={`Imagine pentru ${apartment.name}`}
                            />
                        )}
                    </div>
                    <hr className="line-image" />
                    {/* Informații apartament */}
                    <div className="info-container">
                        <p>
                            <strong>Pret:</strong> {apartment.price} RON
                        </p>
                        <p>
                            <strong>Locatie:</strong> {apartment.location}
                        </p>
                        <p>
                            <strong>Numar de camere:</strong> {apartment.numberofrooms}
                        </p>

                        {/* Exemplu: "Coleg de camera" (dacă ai această informație în DB) */}
                        <p>
                            <strong>Coleg de camera:</strong> (aici textul dorit)
                        </p>

                        <p>
                            <strong>Descriere:</strong> {apartment.description}
                        </p>
                    </div>
                </div>

                {/* Partea dreapta */}
                <div className="right-section">
                    {/* Card Proprietar */}
                    <div className="owner-section">
                        <h2>Proprietar</h2>
                        <p>{apartment.ownername}</p>
                        {/* Butoane Detalii și Chat în colțurile de jos */}
                        <button
                            className="owner-section-button details-btn"
                            onClick={() => setshowOwnerPop_up(true)}
                        >
                            Detalii
                        </button>
                        <button className="owner-section-button chat-btn">Chat</button>
                        <button className="reserve-btn" onClick={handleReserve}>
                            Rezerva acum
                        </button>
                    </div>
                </div>
            </div>

            {/* Afișează modalul dacă showOwnerPop_up este true */}
            {showOwnerPop_up && (
                <OwnerPop_up
                    ownername={apartment.ownername}
                    owneremail={apartment.owneremail}
                    phoneNumber="0789641230"
                    onClose={() => setshowOwnerPop_up(false)}
                />
            )}
        </div>
    );
};

export default ApartmentDetails;
