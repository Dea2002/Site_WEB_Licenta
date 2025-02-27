// frontend/src/Confirmation.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Bara_navigatie from "./Bara_navigatie";

const Confirmation: React.FC = () => {
    const navigate = useNavigate();

    const handleBackHome = () => {
        navigate("/");
    };

    return (
        <div>
            <Bara_navigatie />
            <h1>Rezervare Confirmata</h1>
            <p>Multumim! Rezervarea ta a fost efectuata cu succes.</p>
            <button onClick={handleBackHome} className="button">
                inapoi la Acasa
            </button>
        </div>
    );
};

export default Confirmation;
