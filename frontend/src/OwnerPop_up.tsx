import React from "react";
import { LuPhone } from "react-icons/lu";
import { FiMail } from "react-icons/fi";
import "./OwnerPop_up.css";

interface OwnerPop_upProps {
    ownername?: string;
    owneremail?: string;
    phoneNumber?: string;
    onClose: () => void;
}
// adaugam informatiile despre proprietar

const OwnerPop_up: React.FC<OwnerPop_upProps> = ({
    ownername,
    owneremail,
    phoneNumber,
    onClose,
}) => {
    return (
        <div className="overlay-popup" onClick={onClose}>
            <div className="card-popup" onClick={(e) => e.stopPropagation()}>
                <button className="button-closepopup" onClick={onClose}>
                    <strong>X</strong>
                </button>
                <div className="card-popup-content">
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

                    <div className="text-description">
                        <h2>Descriere</h2>
                    </div>
                    <hr className="line-popup" />

                    <div className="text-interese">
                        <h2>Interese despre proprietar</h2>
                    </div>
                    <hr className="line-popup" />

                    <div className="text-proprietati">
                        <h2>Alte proprietati</h2>
                    </div>

                    <hr className="line-popup" />
                </div>
            </div>
        </div>
    );
};

export default OwnerPop_up;
