// // frontend/src/ApartmentDetails.tsx
// import React, { useState, useEffect, useContext } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { Apartment } from './types';
// import { AuthContext } from './AuthContext';
// import Bara_navigatie from './Bara_navigatie';
// import Login from './Login';

// const ApartmentDetails: React.FC = () => {
//     const { id } = useParams<{ id: string }>();
//     const [apartment, setApartment] = useState<Apartment | null>(null);
//     const [error, setError] = useState('');
//     const { isAuthenticated } = useContext(AuthContext);
//     const navigate = useNavigate();

//     useEffect(() => {
//         if (id) {
//             axios.get<Apartment>(`http://localhost:5000/apartments/${id}`)
//                 .then(response => {
//                     setApartment(response.data);
//                 })
//                 .catch(error => {
//                     console.error('Eroare la preluarea detaliilor apartamentului:', error);
//                     setError('Apartamentul nu a fost gasit.');
//                 });
//         }
//     }, [id]);

//     const handleReserve = () => {
//         console.log("handleReserve");
//         if (isAuthenticated) {
//             console.log("autentificat");

//             // navigate('/reservation', { state: { apartmentId: id } });
//             navigate('/confirmation', { state: { apartmentId: id } });
//         } else {
//             navigate('/login', { state: { from: `/apartment/${id}` } }); // Trimite locatia initiala
//         }
//     };

//     if (error) {
//         return (
//             <div>
//                 <Bara_navigatie />
//                 <p className="error">{error}</p>
//             </div>
//         );
//     }

//     if (!apartment) {
//         return (
//             <div>
//                 <Bara_navigatie />
//                 <p>Se incarca detaliile apartamentului...</p>
//             </div>
//         );
//     }

//     return (
//         <div>
//             <Bara_navigatie />
//             <h1>Detalii Apartament</h1>
//             <div className="apartment-details">
//                 <h2>{apartment.name}</h2>
//                 <p><strong>Descriere:</strong> {apartment.description}</p>
//                 <p><strong>Numar de camere:</strong> {apartment.numberofrooms}</p>
//                 <p><strong>Pret:</strong> {apartment.price} RON</p>
//                 <p><strong>Locatie:</strong> {apartment.location}</p>
//                 <p><strong>Proprietar:</strong> {apartment.ownername}</p>
//                 <p><strong>Email proprietar:</strong> {apartment.owneremail}</p>
//                 <p><strong>Status:</strong> {apartment.status}</p>
//                 <p><strong>Total rezervari:</strong> {apartment.totalbooked}</p>
//                 {apartment.image && (
//                     <img src={`/Poze_apartamente/${apartment.image}`} alt={`Imagine pentru ${apartment.name}`} width="300" />
//                 )}
//                 <button onClick={handleReserve} className="button">Rezerva acum</button>
//             </div>
//         </div>
//     );
// };

// export default ApartmentDetails;

import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Apartment } from "./types";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import Login from "./Login";
import "./ApartmentDetails.css";

const ApartmentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            axios
                .get<Apartment>(`http://localhost:5000/apartments/${id}`)
                .then((response) => {
                    setApartment(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", error);
                    setError("Apartamentul nu a fost gasit.");
                });
        }
    }, [id]);

    const handleReserve = () => {
        if (isAuthenticated) {
            navigate("/confirmation", { state: { apartmentId: id } });
        } else {
            navigate("/login", { state: { from: `/apartment/${id}` } });
        }
    };

    if (error) {
        return (
            <div>
                <Bara_navigatie />
                <p className="error">{error}</p>
            </div>
        );
    }

    if (!apartment) {
        return (
            <div>
                <Bara_navigatie />
                <p>Se incarca detaliile apartamentului...</p>
            </div>
        );
    }

    return (
        <div className="apartment-details-page">
            <Bara_navigatie />
            {/* <h1>Detalii Apartament</h1> */}

            <div className="details-container">
                {/* Partea stanga */}
                <div className="left-section">
                    {/* Imaginea apartamentului */}
                    <div className="image-container">
                        {apartment.image && (
                            <img
                                src={`/Poze_apartamente/${apartment.image}`}
                                alt={`Imagine pentru ${apartment.name}`}
                            />
                        )}
                    </div>

                    {/* Informații apartament */}
                    <div className="info-container">
                        <p>
                            <strong>Pret:</strong> {apartment.price} RON
                        </p>
                        <p>
                            <strong>Locatie:</strong> {apartment.location}
                        </p>
                        <p>
                            <strong>Numar de camere:</strong> {apartment.numberofrooms}
                        </p>

                        {/* Exemplu: "Coleg de camera" (dacă ai această informație în DB) */}
                        <p>
                            <strong>Coleg de camera:</strong> (aici textul dorit)
                        </p>

                        <p>
                            <strong>Descriere:</strong> {apartment.description}
                        </p>
                    </div>
                </div>

                {/* Partea dreapta */}
                <div className="right-section">
                    {/* Card Proprietar */}
                    <div className="owner-card">
                        <h2>Proprietar</h2>
                        <p>{apartment.ownername}</p>

                        {/* Butoane Detalii și Chat în colțurile de jos */}
                        <button className="owner-card-button details-btn">Detalii</button>
                        <button className="owner-card-button chat-btn">Chat</button>
                    </div>

                    {/* Buton Rezerva acum sub card */}
                    <button className="reserve-btn" onClick={handleReserve}>
                        Rezerva acum
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApartmentDetails;
