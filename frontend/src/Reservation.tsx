// frontend/src/Reservation.tsx
import React, { useState, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import { Apartment } from "./types";

interface ReservationState {
    apartmentId: string;
}

const Reservation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useContext(AuthContext);
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const state = location.state as ReservationState | undefined;

    useEffect(() => {
        if (state && state.apartmentId) {
            axios
                .get<Apartment>(`http://localhost:5000/apartments/${state.apartmentId}`)
                .then((response) => {
                    setApartment(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", error);
                    setError("Apartamentul nu a putut fi gasit.");
                });
        } else {
            setError("ID-ul apartamentului nu este specificat.");
        }
    }, [state]);

    const handleReservation = () => {
        console.log("fac rezervare");

        if (state && state.apartmentId) {
            console.log("am state");

            axios
                .post(
                    "http://localhost:5000/reserve",
                    { apartmentId: state.apartmentId },
                    {
                        headers: {
                            Authorization: `Bearer ${isAuthenticated}`, // Adauga token-ul in antet
                            "Content-Type": "application/json",
                        },
                    },
                )
                .then((response) => {
                    setSuccess("Rezervare efectuata cu succes!");
                    navigate("/confirmation");
                })
                .catch((error) => {
                    console.error("Eroare la efectuarea rezervarii:", error);
                    setError("Eroare la efectuarea rezervarii.");
                });
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
        <div>
            <Bara_navigatie />
            <h1>Rezervare Apartament</h1>
            <div className="reservation-details">
                <h2>{apartment.name}</h2>
                <p>
                    <strong>Descriere:</strong> {apartment.description}
                </p>
                <p>
                    <strong>Numar de camere:</strong> {apartment.numberofrooms}
                </p>
                <p>
                    <strong>Pret:</strong> {apartment.price} RON
                </p>
                <p>
                    <strong>Locatie:</strong> {apartment.location}
                </p>
                <p>
                    <strong>Proprietar:</strong> {apartment.ownername}
                </p>
                <p>
                    <strong>Email proprietar:</strong> {apartment.owneremail}
                </p>
                <p>
                    <strong>Status:</strong> {apartment.status}
                </p>
                <p>
                    <strong>Total rezervari:</strong> {apartment.totalbooked}
                </p>
                {apartment.image && (
                    <img
                        src={`/Poze_apartamente/${apartment.image}`}
                        alt={`Imagine pentru ${apartment.name}`}
                        width="300"
                    />
                )}
                <button onClick={handleReservation} className="button">
                    Rezerva acum
                </button>
            </div>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
        </div>
    );
};

export default Reservation;
