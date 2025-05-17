// frontend/src/Reservation.tsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from './api';
import Bara_navigatie from "./NavBars/Bara_navigatie";
import { Apartment } from "./types";

interface ReservationState {
    apartmentId: string;
}

const Reservation: React.FC = () => {
    const location = useLocation();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");

    const state = location.state as ReservationState | undefined;

    useEffect(() => {
        if (state && state.apartmentId) {
            api
                .get<Apartment>(`/apartments/${state.apartmentId}`)
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
        <div />
    );
};

export default Reservation;
