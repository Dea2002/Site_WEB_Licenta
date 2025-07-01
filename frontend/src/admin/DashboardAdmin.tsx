import React, { useEffect, useState, useContext } from "react";
import { api } from '../api';
import { AuthContext } from "../authenticate/AuthContext";
import { useNavigate } from "react-router-dom";
import "./DashboardAdmin.css";

interface Stats {
    totalApartments: number;
    totalUsers: number;
    totalOwners: number;
}

const DashboardAdmin: React.FC = () => {
    const { token } = useContext(AuthContext);
    const [stats, setStats] = useState<Stats | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        api
            .get("/admin/stats", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setStats(response.data);
            })
            .catch((error) => {
                console.error("Eroare la obtinerea statisticilor:", error);
            });
    }, [token]);

    const handleCardClick = (path: string) => {
        navigate(path);
    };

    return (
        <div className="dashboard-container">
            <h1>Panou de Control Admin</h1>
            {stats ? (
                <div className="cards-container">
                    <div className="card" onClick={() => handleCardClick("/admin/apartments")}>
                        <h2>Total Apartamente</h2>
                        <p>{stats.totalApartments}</p>
                    </div>
                    <div className="card" onClick={() => handleCardClick("/admin/users")}>
                        <h2>Total Utilizatori</h2>
                        <p>{stats.totalUsers}</p>
                    </div>
                    <div className="card" onClick={() => handleCardClick("/admin/owners")}>
                        <h2>Total Proprietari</h2>
                        <p>{stats.totalOwners}</p>
                    </div>
                </div>
            ) : (
                <p>Se incarca statisticile...</p>
            )}
        </div>
    );
};

export default DashboardAdmin;
