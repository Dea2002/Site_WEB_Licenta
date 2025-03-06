// frontend/src/DashboardOwner.tsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import "./DashboardOwner.css";
import { useNavigate } from "react-router-dom";

const DashboardOwner: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartmentsCount, setApartmentsCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.email) {
            axios
                .get(`http://localhost:5000/owner/dashboard/${user.email}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((response) => {
                    setApartmentsCount(response.data.count);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea numărului de apartamente:", error);
                });
        }
    }, [user, token]);

    const handleCardClick = () => {
        // Navigăm către noua pagină care afișează lista apartamentelor
        navigate("/owner/apartments");
    };

    const listNewApartment = () => {
        navigate("/owner-dashboard/list_apartment");
    };

    return (
        <div>
            <Bara_nav_OwnerDashboard />
            <div className="dashboard-owner-container">
                <h1>Apartamentele tale</h1>
                <div className="card-owner" onClick={handleCardClick}>
                    <p>{apartmentsCount}</p>
                </div>
                <button onClick={listNewApartment}>List new apartment</button>
            </div>
        </div>
    );
};

export default DashboardOwner;
