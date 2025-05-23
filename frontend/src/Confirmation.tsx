import React from "react";
import { useNavigate } from "react-router-dom";

const Confirmation: React.FC = () => {
    const navigate = useNavigate();

    const handleBackHome = () => {
        navigate("/");
    };

    return (
        <div>
            <h1>Rezervare Confirmata</h1>
            <p>Multumim! Rezervarea ta a fost efectuata cu succes.</p>
            <button onClick={handleBackHome} className="button">
                inapoi la Acasa
            </button>
        </div>
    );
};

export default Confirmation;
