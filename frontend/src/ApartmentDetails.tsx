import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Apartment } from "./types";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import Login from "./Login";
import "./ApartmentDetails.css";
import OwnerPop_up from "./OwnerPop_up";

const ApartmentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");
    const { isAuthenticated, user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // Stare pentru afișarea modalului
    const [showOwnerPop_up, setshowOwnerPop_up] = useState(false);

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

    useEffect(() => {
        if (showOwnerPop_up) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showOwnerPop_up]);

    const handleReserve = async () => {
        console.log("am apasat butonul");
        try {
            // Presupunem că AuthContext furnizează și user, cu proprietatea _id
            if (!user) {
                navigate("/login", { state: { from: `/apartment/${id}` } });
                // throw new Error("Utilizatorul nu este autentificat");
                return;
            }
            await axios.post(
                "http://localhost:5000/create_reservation_request",
                {
                    clientId: user!._id,
                    apartmentId: id,
                    checkIn: "2025-03-09",
                    checkOut: "2025-03-10",
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
        } catch (err: any) {
            setError(
                err.response?.data?.message || "Eroare la rezervare. Încearcă din nou mai târziu.",
            );
            // console.log(err);
        }

        // if (isAuthenticated) {
        //     navigate("/confirmation", { state: { apartmentId: id } });
        // } else {
        // }
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
                                // alt={`Imagine pentru ${apartment.name}`}
                            />
                        )}
                    </div>
                    <hr className="line-image" />
                    {/* Informații apartament */}
                    <div className="info-container">
                        <p>
                            <strong>Pret:</strong> {apartment.price} RON
                        </p>
                        <p>
                            <strong>Locatie:</strong> {apartment.location}
                        </p>
                        <p>
                            <strong>Numar de camere:</strong> {apartment.numberOfRooms}
                        </p>
                        <p>
                            <strong>Numar de băi:</strong> {apartment.numberOfBathrooms}
                        </p>
                        <p>
                            <strong>Etajul:</strong> {apartment.floorNumber}
                        </p>
                        <p>
                            <strong>Parcare:</strong> {apartment.parking ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Prietenos cu animalele:</strong>{" "}
                            {apartment.petFriendly ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Suprafata totala:</strong> {apartment.totalSurface} mp
                        </p>
                        <p>
                            <strong>Lift:</strong> {apartment.elevator ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Anul constructiei:</strong> {apartment.constructionYear}
                        </p>
                        <p>
                            <strong>Anul renovarii:</strong> {apartment.renovationYear}
                        </p>
                        <p>
                            <strong>Pret Internet:</strong> {apartment.internetPrice} RON
                        </p>
                        <p>
                            <strong>Pret TV:</strong> {apartment.TVPrice} RON
                        </p>
                        <p>
                            <strong>Pret apa:</strong> {apartment.waterPrice} RON
                        </p>
                        <p>
                            <strong>Pret gaz:</strong> {apartment.gasPrice} RON
                        </p>
                        <p>
                            <strong>Pret electricitate:</strong> {apartment.electricityPrice} RON
                        </p>
                        <p>
                            <strong>Aer conditionat:</strong>{" "}
                            {apartment.airConditioning ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Balcon:</strong> {apartment.balcony ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Coleg de camera:</strong> {apartment.colleagues ? "Da" : "Nu"}
                        </p>
                    </div>
                </div>

                {/* Partea dreapta */}
                <div className="right-section">
                    {/* Card Proprietar */}
                    {apartment.ownerInformation && (
                        <div className="owner-section">
                            <h2>Proprietar</h2>
                            <p>{apartment.ownerInformation.fullName}</p>
                            {/* Butoane Detalii și Chat în colțurile de jos */}
                            <button
                                className="owner-section-button details-btn"
                                onClick={() => setshowOwnerPop_up(true)}
                            >
                                Detalii
                            </button>
                            <button className="owner-section-button chat-btn">Chat</button>
                            <button className="reserve-btn" onClick={handleReserve}>
                                Rezerva acum
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Afișează modalul dacă showOwnerPop_up este true */}
            {showOwnerPop_up && (
                <OwnerPop_up
                    ownername={apartment.ownerInformation?.fullName}
                    owneremail={apartment.ownerInformation?.email}
                    phoneNumber={apartment.ownerInformation?.phoneNumber}
                    onClose={() => setshowOwnerPop_up(false)}
                />
            )}
        </div>
    );
};

export default ApartmentDetails;
