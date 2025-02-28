// avem nevoie de un component modal pentru sectiunea de pop-up

import React from "react";
import { LuPhone } from "react-icons/lu";
import { FiMail } from "react-icons/fi";
import "./OwnerPop_up.css";

interface OwnerPop_upProps {
    ownername: string;
    owneremail: string;
    phoneNumber: string;
    onClose: () => void;
    // adaugam informatiile despre proprietar
}

const OwnerPop_up: React.FC<OwnerPop_upProps> = ({
    ownername,
    owneremail,
    phoneNumber,
    onClose,
}) => {
    return (
        <div className="overlay-popup" onClick={onClose}>
            <div className="card-popup" onClick={(e) => e.stopPropagation()}>
                <h2>
                    <i
                        className="fa-solid fa-user-tie circle-icon"
                        style={{ marginRight: "20px" }}
                    />
                    <strong className="owner-name">{ownername}</strong>
                </h2>

                <p>
                    <LuPhone className="phone-icon" />
                    <span className="phone-text">{phoneNumber}</span>
                </p>
                <p>
                    <FiMail className="email-icon" />
                    <span className="email-text">{owneremail}</span>
                </p>

                <hr className="line-popup" />
                <button onClick={onClose}>Inchide</button>
            </div>
        </div>
    );
};

export default OwnerPop_up;
