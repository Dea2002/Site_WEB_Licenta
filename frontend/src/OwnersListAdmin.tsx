import React, { useEffect, useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./OwnersListAdmin.css";

interface Owner {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: string;
}

const OwnersListAdmin: React.FC = () => {
    const { token } = useContext(AuthContext);
    const [owners, setUsers] = useState<Owner[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        api
            .get("/admin/owners", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setUsers(response.data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Eroare la obtinerea proprietarilor:", error);
                setLoading(false);
            });
    }, [token]);

    if (loading) {
        return <p>Se incarca proprietarii...</p>;
    }

    return (
        <div className="admin-owners-container">
            <h1>Lista de Proprietari</h1>
            <div className="owners-list">
                {owners.map((owner) => (
                    <div key={owner._id} className="owner-card">
                        <h2>{owner.fullName}</h2>
                        <p>
                            <strong>Email:</strong> {owner.email}
                        </p>
                        <p>
                            <strong>Telefon:</strong> {owner.phoneNumber}
                        </p>
                        {/* Poti adauga mai multe detalii sau optiuni aici */}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OwnersListAdmin;
