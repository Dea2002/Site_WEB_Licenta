import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Apartment } from "./types"; // Assuming types.ts defines the Apartment interface
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie"; // Your Navbar component
import OwnerPop_up from "./OwnerPop_up"; // Your Owner Popup component
import ReservationPopup from "./ReservationPopup"; // Your Reservation Popup component
import { format, differenceInCalendarDays } from "date-fns";
import "./ApartmentDetails.css"; // Ensure this CSS is imported
import "leaflet/dist/leaflet.css";
import MapPop_up from "./MapPop_up"; // Your Map Popup component

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

    // State for popups
    const [showOwnerPop_up, setshowOwnerPop_up] = useState(false);
    const [showReservationPopup, setShowReservationPopup] = useState(false);
    const [selectedMapData, setSelectedMapData] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);
    const [selectedDates, setSelectedDates] = useState<selectedDates | null>(null);

    // Handler to receive dates from ReservationPopup
    const handleDatesSelected = (checkIn: Date, checkOut: Date) => {
        setSelectedDates({ checkIn, checkOut });
        setError(""); // Clear previous booking errors when new dates are selected
    };

    // Fetch apartment details
    useEffect(() => {
        if (id) {
            axios
                .get<Apartment>(`http://localhost:5000/apartments/${id}`)
                .then((response) => {
                    setApartment(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", error);
                    setError("Apartamentul nu a fost gasit sau a apărut o eroare.");
                });
        }
    }, [id]);

    // Handle body scroll when popups are open
    useEffect(() => {
        if (showOwnerPop_up || showReservationPopup || selectedMapData) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            // Cleanup function
            document.body.style.overflow = "auto";
        };
    }, [showOwnerPop_up, showReservationPopup, selectedMapData]);

    // Function to open the date selection popup
    const selectInterval = async () => {
        setShowReservationPopup(true);
    };

    // Function to send reservation request
    const makeReservation = async () => {
        if (!selectedDates) {
            setError("Selectati mai intai intervalul dorit.");
            setShowReservationPopup(true); // Re-open popup if no dates selected
            return;
        }
        if (!isAuthenticated || !user || !token) {
            setError("Trebuie sa fiti autentificat pentru a trimite o cerere de rezervare.");
            // Consider navigating to login: navigate('/login');
            return;
        }
        setError(""); // Clear previous errors
        try {
            await axios.post(
                "http://localhost:5000/create_reservation_request",
                {
                    clientId: user._id,
                    apartmentId: id,
                    checkIn: format(selectedDates.checkIn, "yyyy-MM-dd"),
                    checkOut: format(selectedDates.checkOut, "yyyy-MM-dd"),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            // Handle successful request submission
            console.log("Reservation request sent successfully!");
            alert("Cererea de rezervare a fost trimisă cu succes!"); // Simple confirmation
            // Optionally navigate to a confirmation or 'my requests' page
            navigate("/my-requests"); // Example navigation
        } catch (err: any) {
            setError(
                err.response?.data?.message || "Eroare la trimiterea cererii. Încercați din nou.",
            );
            console.error("Reservation Error:", err);
        }
    };

    // Function to handle map button click
    const handleLocationClick = async (apt: Apartment) => {
        setError(""); // Clear previous errors
        try {
            const response = await axios.get("https://nominatim.openstreetmap.org/search", {
                params: {
                    q: apt.location,
                    format: "json",
                    limit: 1,
                },
            });

            if (response.data.length > 0) {
                const { lat, lon } = response.data[0];
                setSelectedMapData({
                    lat: parseFloat(lat),
                    lng: parseFloat(lon),
                    address: apt.location,
                });
            } else {
                console.error("Nu s-au gasit coordonate pentru adresa data");
                setError("Nu s-au putut găsi coordonatele pentru această locație.");
            }
        } catch (error) {
            console.error("Eroare la obtinerea coordonatelor:", error);
            setError("Eroare la căutarea locației pe hartă.");
        }
    };

    // Loading and initial error states
    if (!apartment && error) {
        return (
            <div>
                <Bara_navigatie />
                <div className="loading-error-container">
                    <p className="error">{error}</p>
                </div>
            </div>
        );
    }
    if (!apartment) {
        return (
            <div>
                <Bara_navigatie />
                <div className="loading-error-container">
                    <p>Se incarca detaliile apartamentului...</p>
                </div>
            </div>
        );
    }

    // Helper function to render selected dates and costs (part of the new right section logic)
    const renderSelectedDatesInfo = () => {
        if (!selectedDates) return null;

        // Ensure calculation handles potential NaN/nulls gracefully
        const checkInDate = selectedDates.checkIn;
        const checkOutDate = selectedDates.checkOut;

        if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
            return <p className="error booking-error">Interval de date invalid.</p>;
        }

        const nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate));
        const nightsText = nights === 1 ? "1 noapte" : `${nights} nopti`;

        const pricePerNight = parseFloat(apartment.price?.toString() || "0") || 0;
        const internetPriceMonthly = parseFloat(apartment.internetPrice?.toString() || "0") || 0;
        const tvPriceMonthly = parseFloat(apartment.TVPrice?.toString() || "0") || 0;
        const waterPriceMonthly = parseFloat(apartment.waterPrice?.toString() || "0") || 0;
        const gasPriceMonthly = parseFloat(apartment.gasPrice?.toString() || "0") || 0;
        const electricityPriceMonthly =
            parseFloat(apartment.electricityPrice?.toString() || "0") || 0;

        const dailyInternetCost = internetPriceMonthly / 30;
        const dailyTVCost = tvPriceMonthly / 30;
        const dailyWaterCost = waterPriceMonthly / 30;
        const dailyGasCost = gasPriceMonthly / 30;
        const dailyElectricityCost = electricityPriceMonthly / 30;

        const extraDailyCost =
            dailyInternetCost + dailyTVCost + dailyWaterCost + dailyGasCost + dailyElectricityCost;
        const extraTotalCost = extraDailyCost * nights;
        const apartmentTotalCost = pricePerNight * nights;
        const finalTotalCost = apartmentTotalCost + extraTotalCost;

        return (
            // Using the structured selected-dates-info div from the new layout
            <div className="selected-dates-info">
                <p>
                    <span>Check-in:</span> {format(checkInDate, "dd/MM/yyyy")}
                </p>
                <p>
                    <span>Check-out:</span> {format(checkOutDate, "dd/MM/yyyy")}
                </p>
                <hr className="line-divider short" /> {/* Use new divider class */}
                <p>
                    <span>Pret Cazare ({nightsText}):</span> {apartmentTotalCost.toFixed(2)} RON
                </p>
                <p>
                    <span>Costuri Extra Estim. ({nightsText}):</span> {extraTotalCost.toFixed(2)}{" "}
                    RON
                </p>
                <hr className="line-divider short bold" /> {/* Use new divider class */}
                <p className="total-price">
                    <span>Pret Total Estimat:</span> {finalTotalCost.toFixed(2)} RON
                </p>
                {/* Using original button class and inline style for width */}
                <button
                    className="owner-section-button" // Your original class
                    onClick={selectInterval}
                    style={{
                        width: "161px",
                        marginTop: "15px",
                        display: "block",
                        margin: "15px auto 0 auto",
                    }} // Your original width + centering margin
                >
                    Modifica intervalul
                </button>
            </div>
        );
    };

    // Main component render
    return (
        <div className="apartment-details-page">
            <Bara_navigatie />
            <div className="details-container">
                {/* === Partea stanga (Imagine + Detalii Grupate) === */}
                <div className="left-section">
                    {/* Imaginea principala */}
                    <div className="image-container">
                        {apartment.image && (
                            <img
                                src={`/Poze_apartamente/${apartment.image}`}
                                alt={`Imagine ${apartment.location}`} // Add better alt text
                            />
                        )}
                    </div>

                    {/* Titlu - Locatie si Pret */}
                    <div className="title-location-price">
                        <h2>Apartament in {apartment.location}</h2>
                        <p className="price-display">{apartment.price} RON / noapte</p>
                        <button
                            className="button-map"
                            onClick={() => handleLocationClick(apartment)}
                        >
                            <span className="button-map-text">Vezi harta</span>
                            <span className="button-map-icon">
                                <img src="/Poze_apartamente/location2.png" alt="Icon harta" />
                            </span>
                        </button>
                    </div>

                    {/* Grup Detalii Principale */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-info-circle icon-prefix"></i>Detalii Principale
                        </h3>
                        <hr className="line-divider" />
                        <p>
                            <span>Numar de camere:</span> {apartment.numberOfRooms}
                        </p>
                        <p>
                            <span>Numar de bai:</span> {apartment.numberOfBathrooms}
                        </p>
                        <p>
                            <span>Etajul:</span> {apartment.floorNumber}
                        </p>
                        <p>
                            <span>Suprafata totala:</span> {apartment.totalSurface} mp
                        </p>
                        <p>
                            <span>Anul constructiei:</span> {apartment.constructionYear}
                        </p>
                        {apartment.renovationYear && (
                            <p>
                                <span>Anul renovarii:</span> {apartment.renovationYear}
                            </p>
                        )}
                    </div>

                    {/* Grup Facilitati */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-check-circle icon-prefix"></i>Facilități
                        </h3>
                        <hr className="line-divider" />
                        <p>
                            <span>Parcare:</span> {apartment.parking ? "Da" : "Nu"}
                        </p>
                        <p>
                            <span>Prietenos cu animalele:</span>{" "}
                            {apartment.petFriendly ? "Da" : "Nu"}
                        </p>
                        <p>
                            <span>Lift:</span> {apartment.elevator ? "Da" : "Nu"}
                        </p>
                        <p>
                            <span>Aer conditionat:</span> {apartment.airConditioning ? "Da" : "Nu"}
                        </p>
                        <p>
                            <span>Balcon:</span> {apartment.balcony ? "Da" : "Nu"}
                        </p>
                    </div>

                    {/* Grup Costuri Extra Estimate (Lunare / Zilnice - clarificam) */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-coins icon-prefix"></i>Costuri Extra Estimate
                            (lunar)
                        </h3>
                        <hr className="line-divider" />
                        <p>
                            <span>Internet:</span> {apartment.internetPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>TV:</span> {apartment.TVPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>Apa (estimat):</span> {apartment.waterPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>Gaz (estimat):</span> {apartment.gasPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>Electricitate (estimat):</span>{" "}
                            {apartment.electricityPrice ?? "N/A"} RON
                        </p>
                    </div>

                    {/* Grup Colegi */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-users icon-prefix"></i>Colegi de Apartament
                        </h3>
                        <hr className="line-divider" />
                        <p>
                            <span>Se accepta colegi:</span> {apartment.colleagues ? "Da" : "Nu"}
                        </p>
                        {apartment.colleagues && (
                            <p>
                                <span>Nume coleg existent:</span>{" "}
                                {apartment.colleaguesNames &&
                                apartment.colleaguesNames.trim() !== ""
                                    ? apartment.colleaguesNames
                                    : "Niciunul momentan"}
                            </p>
                        )}
                    </div>
                </div>

                {/* === New Right Section Structure with Original Button Styles === */}
                <div className="right-section">
                    {apartment.ownerInformation && (
                        // Using new card structure
                        <div className="owner-booking-card">
                            <div className="owner-info-header">
                                <h3>Proprietar</h3>
                                <p>{apartment.ownerInformation.fullName}</p>
                                {/* Using new buttons container but original button classes */}
                                <div className="owner-buttons">
                                    <button
                                        className="owner-section-button details-btn" // Original Class
                                        onClick={() => setshowOwnerPop_up(true)}
                                    >
                                        Detalii
                                    </button>
                                    <button className="owner-section-button chat-btn">Chat</button>{" "}
                                    {/* Original Class */}
                                </div>
                            </div>
                            <hr className="line-divider thick" /> {/* Using new divider class */}
                            <div className="booking-section">
                                <h4>Verifica Disponibilitatea</h4>
                                {renderSelectedDatesInfo()}{" "}
                                {/* Renders dates & original 'Modifica' button */}
                                {!selectedDates && (
                                    // Using new button style for initial selection
                                    <button
                                        className="select-interval-btn"
                                        onClick={selectInterval}
                                    >
                                        Selecteaza Perioada
                                    </button>
                                )}
                            </div>
                            <hr className="line-divider thick" /> {/* Using new divider class */}
                            {/* Error display */}
                            {error && <p className="error booking-error">{error}</p>}
                            {/* Using original reserve button class */}
                            <button
                                className="reserve-btn"
                                onClick={selectedDates ? makeReservation : selectInterval}
                                disabled={!isAuthenticated}
                                title={
                                    !isAuthenticated
                                        ? "Trebuie sa fiti autentificat pentru a rezerva"
                                        : selectedDates
                                        ? "Trimite Cerere Rezervare"
                                        : "Selectati perioada"
                                }
                            >
                                <span className="reserve-btn-text">
                                    {selectedDates
                                        ? "Trimite Cerere Rezervare"
                                        : "Verifica Disponibilitate"}
                                </span>
                                <span className="reserve-btn-icon">
                                    <img src="/Poze_apartamente/booking.png" alt="Booking Icon" />
                                </span>
                            </button>
                            {!isAuthenticated && (
                                <p className="auth-warning">Autentifica-te pentru a rezerva</p>
                            )}
                        </div>
                    )}
                </div>
            </div>{" "}
            {/* End details-container */}
            {/* Pop-ups remain the same */}
            {showReservationPopup && (
                <ReservationPopup
                    onClose={() => setShowReservationPopup(false)}
                    onDatesSelected={handleDatesSelected}
                    apartmentId={id!}
                />
            )}
            {showOwnerPop_up && (
                <OwnerPop_up
                    ownername={apartment.ownerInformation?.fullName}
                    owneremail={apartment.ownerInformation?.email}
                    phoneNumber={apartment.ownerInformation?.phoneNumber}
                    onClose={() => setshowOwnerPop_up(false)}
                />
            )}
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
