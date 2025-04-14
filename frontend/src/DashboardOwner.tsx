import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import { useNavigate } from "react-router-dom";
import { FaBuilding } from "react-icons/fa";
import "./DashboardOwner.css";

const DashboardOwner: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartmentsCount, setApartmentsCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.email) {
            axios
                .get(`http://localhost:5000/owner/dashboard/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((response) => {
                    setApartmentsCount(response.data.count);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea numarului de apartamente:", error);
                });
        }
    }, [user, token]);

    const handleCardClick = () => {
        // Navigăm către pagina cu lista apartamentelor
        navigate("/owner/apartments");
    };

    const listNewApartment = () => {
        // Navigăm către pagina de listare a unui nou apartament
        navigate("/owner-dashboard/list_apartment");
    };

    return (
        <div>
            <Bara_nav_OwnerDashboard />
            <div className="dashboard-owner-page">
                <div className="dashboard-owner-apartments">
                    <div className="dashboard-header">
                        <h2>Dashboard</h2>
                    </div>
                    {/* Card-ul dashboard-ului */}
                    <div className="dashboard-card" onClick={handleCardClick}>
                        <div className="card-icon-container">
                            <FaBuilding className="card-icon" />
                        </div>

                        <p className="card-label">Total Apartments</p>
                        <div className="card-count">
                            {apartmentsCount !== null ? apartmentsCount : "..."}
                        </div>
                    </div>

                    <button className="card-button" onClick={listNewApartment}>
                        + List New Apartment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardOwner;
