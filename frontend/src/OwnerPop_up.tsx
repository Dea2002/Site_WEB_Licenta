import React from "react";
import { FiMail } from "react-icons/fi";
import "./OwnerPop_up.css";

interface OwnerPop_upProps {
    ownername?: string;
    owneremail?: string;
    onClose: () => void;
}
// adaugam informatiile despre proprietar

const OwnerPop_up: React.FC<OwnerPop_upProps> = ({
    ownername,
    owneremail,
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
                        <FiMail className="email-icon" />
                        <span className="email-text">{owneremail}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OwnerPop_up;
