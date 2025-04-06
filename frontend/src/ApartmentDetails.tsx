import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Apartment } from "./types";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import OwnerPop_up from "./OwnerPop_up";
import ReservationPopup from "./ReservationPopup";
import { format, differenceInCalendarDays } from "date-fns";
import "./ApartmentDetails.css";
import "leaflet/dist/leaflet.css";
import MapPop_up from "./MapPop_up";
import { LiaXing } from "react-icons/lia";

interface selectedDates {
    checkIn: Date;
    checkOut: Date;
}

const ApartmentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [error, setError] = useState("");
    const { isAuthenticated, user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // Stare pentru afisarea modalului
    const [showOwnerPop_up, setshowOwnerPop_up] = useState(false);
    const [showReservationPopup, setShowReservationPopup] = useState(false);
    const [selectedMapData, setSelectedMapData] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);
    const [selectedDates, setSelectedDates] = useState<selectedDates | null>(null);

    // handler ce primeste datele din ReservationPopup
    const handleDatesSelected = (checkIn: Date, checkOut: Date) => {
        setSelectedDates({ checkIn, checkOut });
    };

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

    const selectInterval = async () => {
        setShowReservationPopup(true);
    };

    const makeReservation = async () => {
        console.log(selectedDates);
        try {
            console.log(selectedDates);
            await axios.post(
                "http://localhost:5000/create_reservation_request",
                {
                    clientId: user!._id,
                    apartmentId: id,
                    checkIn: format(selectedDates!.checkIn, "yyyy-MM-dd"),
                    checkOut: format(selectedDates!.checkOut, "yyyy-MM-dd"),
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

    const handleLocationClick = async (apartment: Apartment) => {
        try {
            const response = await axios.get("https://nominatim.openstreetmap.org/search", {
                params: {
                    q: apartment.location,
                    format: "json",
                    limit: 1,
                },
            });

            if (response.data.length > 0) {
                const { lat, lon } = response.data[0];
                setSelectedMapData({
                    lat: parseFloat(lat),
                    lng: parseFloat(lon),
                    address: apartment.location,
                });
            } else {
                console.error("Nu s-au găsit coordonate pentru adresa dată");
            }
        } catch (error) {
            console.error("Eroare la obținerea coordonatelor:", error);
        }
    };

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
                    {/* Informatii apartament */}
                    <div className="info-container">
                        <p>
                            <strong>Pret:</strong> {apartment.price} RON
                        </p>
                        <p>
                            <strong>Locatie:</strong> {apartment.location}
                            <button
                                className="button-map"
                                onClick={() => handleLocationClick(apartment)}
                            >
                                <span className="button-map-text">Vezi harta</span>
                                <span className="button-map-icon">
                                    <img src="/Poze_apartamente/location2.png" alt="Icon harta" />
                                </span>
                            </button>
                        </p>

                        <p>
                            <strong>Numar de camere:</strong> {apartment.numberOfRooms}
                        </p>
                        <p>
                            <strong>Numar de bai:</strong> {apartment.numberOfBathrooms}
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
                            <strong>Lift:</strong> {apartment.elevator ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Suprafata totala:</strong> {apartment.totalSurface} mp
                        </p>
                        <p>
                            <strong>Aer conditionat:</strong>{" "}
                            {apartment.airConditioning ? "Da" : "Nu"}
                        </p>
                        <p>
                            <strong>Balcon:</strong> {apartment.balcony ? "Da" : "Nu"}
                        </p>

                        <p>
                            <strong>Anul constructiei:</strong> {apartment.constructionYear}
                        </p>
                        <p>
                            <strong>Anul renovarii:</strong> {apartment.renovationYear}
                        </p>

                        <hr className="line-image-info" />

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

                        <hr className="line-image-info" />

                        <p>
                            <strong>Coleg de camera:</strong> {apartment.colleagues ? "Da" : "Nu"}
                        </p>

                        {apartment.colleagues && (
                            <p>
                                <strong>Nume coleg:</strong>{" "}
                                {apartment.colleaguesNames === ""
                                    ? "Momentan nu exista coleg de apartament."
                                    : apartment.colleaguesNames}
                            </p>
                        )}
                    </div>
                </div>

                {/* Partea dreapta */}
                <div className="right-section">
                    {/* Card Proprietar */}
                    {apartment.ownerInformation && (
                        <div className="owner-section">
                            <h2>Proprietar</h2>
                            <p>{apartment.ownerInformation.fullName}</p>
                            {/* Butoane Detalii si Chat in colturile de jos */}
                            {/* <button
                                className="owner-section-button details-btn"
                                onClick={() => setshowOwnerPop_up(true)}
                            >
                                Detalii
                            </button>
                            <button className="owner-section-button chat-btn">Chat</button> */}

                            {/* Container pentru butoanele "Detalii" și "Chat" */}
                            <div className="owner-buttons">
                                <button
                                    className="owner-section-button details-btn"
                                    onClick={() => setshowOwnerPop_up(true)}
                                >
                                    Detalii
                                </button>
                                <button className="owner-section-button chat-btn">Chat</button>
                            </div>

                            {/* Afiseaza datele selectate */}
                            {selectedDates &&
                                (() => {
                                    const nights =
                                        differenceInCalendarDays(
                                            selectedDates.checkOut,
                                            selectedDates.checkIn,
                                        ) + 1;

                                    const nightsText =
                                        nights === 1 ? "1 noapte" : `${nights} nopti`;

                                    // se convertesc preturile in numere
                                    const dailyInternetCost =
                                        (parseFloat(apartment.internetPrice?.toString() || "0") ||
                                            0) / 30;
                                    const dailyTVCost =
                                        (parseFloat(apartment.TVPrice?.toString() || "0") || 0) /
                                        30;
                                    const dailyWaterCost =
                                        parseFloat(apartment.waterPrice?.toString() || "0") || 0;
                                    const dailyGasCost =
                                        parseFloat(apartment.gasPrice?.toString() || "0") || 0;
                                    const dailyElectricityCost =
                                        parseFloat(apartment.electricityPrice?.toString() || "0") ||
                                        0;

                                    // Calcul cost extra zilnic:
                                    const extraDailyCost =
                                        dailyInternetCost +
                                        dailyTVCost +
                                        dailyWaterCost +
                                        dailyGasCost +
                                        dailyElectricityCost;

                                    // Cost total extra pentru perioada selectată:
                                    const extraTotalCost = extraDailyCost * nights;

                                    // Calcul pret apartament total pentru perioada selectată
                                    const apartmentTotalCost = apartment.price * nights;

                                    // Pret total final = cost apartament + costuri extra
                                    const finalTotalCost = apartmentTotalCost + extraTotalCost;

                                    return (
                                        <div className="selected-dates">
                                            <hr className="line-image-dates" />
                                            <p>
                                                Check-in:{" "}
                                                {format(selectedDates.checkIn, "dd/MM/yyyy")}
                                            </p>
                                            <p>
                                                Check-out:{" "}
                                                {format(selectedDates.checkOut, "dd/MM/yyyy")}
                                            </p>
                                            <p>
                                                Pret apartament: {apartmentTotalCost} RON /{" "}
                                                {nightsText}
                                            </p>

                                            <p>
                                                Costuri extra: {extraTotalCost.toFixed(2)} RON /{" "}
                                                {nightsText}
                                            </p>

                                            <p>Pret total: {finalTotalCost.toFixed(2)} RON</p>
                                            <button
                                                className="owner-section-button"
                                                onClick={selectInterval}
                                                style={{ width: "161px" }}
                                            >
                                                Modifica intervalul
                                            </button>
                                            <hr className="line-image-dates" />
                                        </div>
                                    );
                                })()}

                            <button
                                className="reserve-btn"
                                onClick={selectedDates ? makeReservation : selectInterval}
                            >
                                <span className="reserve-btn-text">Rezerva acum</span>
                                <span className="reserve-btn-icon">
                                    <img src="/Poze_apartamente/booking.png" />
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Afisam pop-up-ul gol pentru rezervare */}
                {showReservationPopup && (
                    <ReservationPopup
                        onClose={() => setShowReservationPopup(false)}
                        onDatesSelected={handleDatesSelected}
                        apartmentId={id!} // trimite id-ul apartamentului catre pop-up pentru a putea face request mai departe
                    />
                )}
            </div>

            {/* Afiseaza modalul daca showOwnerPop_up este true */}
            {showOwnerPop_up && (
                <OwnerPop_up
                    ownername={apartment.ownerInformation?.fullName}
                    owneremail={apartment.ownerInformation?.email}
                    phoneNumber={apartment.ownerInformation?.phoneNumber}
                    onClose={() => setshowOwnerPop_up(false)}
                />
            )}

            {/* {showMapPopup && <MapPop_up onClose={() => setShowMapPopup(false)} />} */}

            {selectedMapData && (
                <MapPop_up
                    lat={selectedMapData.lat}
                    lng={selectedMapData.lng}
                    address={selectedMapData.address}
                    onClose={() => setSelectedMapData(null)}
                />
            )}
        </div>
    );
};

export default ApartmentDetails;
