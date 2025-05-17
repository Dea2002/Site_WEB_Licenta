import React, { useState, useEffect, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment } from "./types";
import "./OwnerApartments.css";

const OwnerApartments: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [apartments, setApartments] = useState<Apartment[]>([]);

    useEffect(() => {
        if (user?.email) {
            api
                .get(`/apartments/by-id/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((response) => {
                    setApartments(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea apartamentelor:", error);
                });
        }
    }, [user, token]);

    return (
        <>
            <div className="owner-apartments-container">
                {/* <h1>Apartamentele tale</h1> */}
                <div className="apartments-owner-list">
                    {apartments.length > 0 ? (
                        apartments.map((apartment) => (
                            <div key={apartment._id} className="apartment-owner-card">
                                <img
                                    src={`/Poze_apartamente/${apartment.image}`}
                                    alt={apartment.ownerInformation?.fullName}
                                />
                                <p>
                                    <strong>Locatie: </strong>
                                    {apartment.location}
                                </p>
                                {/* <p>
                                <strong>Pret:</strong> {apartment.price} RON
                            </p>
                            <p>
                                <strong>Numar de camere:</strong> {apartment.numberOfRooms}
                            </p>

                            <p>
                                <strong>Suprafata totala:</strong> {apartment.totalSurface} mp
                            </p>

                            <p>{apartment.description}</p> */}
                                {/* Poti adauga alte detalii dupa necesitate */}
                            </div>
                        ))
                    ) : (
                        <p>Nu ai apartamente listate momentan.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default OwnerApartments;
