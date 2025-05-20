import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from './api';
import { useNavigate } from 'react-router-dom';
import { Apartment } from "./types"; // Assuming types.ts defines the Apartment interface
import { AuthContext } from "./AuthContext";
import OwnerPop_up from "./OwnerPop_up"; // Your Owner Popup component
import ReservationPopup from "./ReservationPopup"; // Your Reservation Popup component
import { format, parseISO, differenceInCalendarDays, isAfter } from "date-fns";
import "leaflet/dist/leaflet.css";
import MapPop_up from "./MapPop_up"; // Your Map Popup component
import { useNotifications } from "./NotificationContext";
import { FaLongArrowAltLeft, FaLongArrowAltRight } from "react-icons/fa";
import "./ApartmentDetails.css"; // Ensure this CSS is imported
import { SelectedDates, Colleague, calculateBookingCosts } from "../utils/RentalDetailsTypes"; // Adjust the import path as necessary


const ApartmentDetails: React.FC = () => {
    const navigate = useNavigate();
    const { refresh } = useNotifications();
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [rooms, setRooms] = useState<{ rooms: number }>({ rooms: 0 });
    const [error, setError] = useState("");
    const { isAuthenticated, user, token } = useContext(AuthContext);
    const [colleaguesList, setColleaguesList] = useState<Colleague[]>([]);

    // State for popups
    const [showOwnerPop_up, setshowOwnerPop_up] = useState(false);
    const [showReservationPopup, setShowReservationPopup] = useState(false);
    const [selectedMapData, setSelectedMapData] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);
    const [selectedDates, setSelectedDates] = useState<SelectedDates | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [blobUrls, setBlobUrls] = useState<string[]>([]);

    // Handler to receive dates from ReservationPopup
    const handleDatesSelected = (checkIn: Date, checkOut: Date, rooms: number) => {
        setSelectedDates({ checkIn, checkOut });
        setRooms({ rooms });
        setError(""); // Clear previous booking errors when new dates are selected
    };

    useEffect(() => {
        if (!apartment?.images?.length) return;
        Promise.all(
            apartment.images.map(src =>
                fetch(src)
                    .then(res => res.blob())
                    .then(blob => URL.createObjectURL(blob))
            )
        )
            .then(urls => setBlobUrls(urls))
            .catch(err => console.error("Nu am putut încărca imaginea:", err));
    }, [apartment?.images]);


    useEffect(() => {
        return () => {
            blobUrls.forEach(u => URL.revokeObjectURL(u));
        };
    }, [blobUrls]);

    // Fetch apartment details
    useEffect(() => {

        if (id) {
            api.get<Apartment>(`/apartments/${id}`)
                .then((response) => {
                    const fetchedApartment = response.data;
                    setApartment(fetchedApartment);
                    setCurrentImageIndex(0);

                    // NOU: Preîncărcarea imaginilor
                    if (fetchedApartment.images && fetchedApartment.images.length > 0) {
                        fetchedApartment.images.forEach(imageUrl => {
                            const img = new Image(); // Creează un nou element de imagine în memorie
                            img.src = imageUrl;      // Setarea sursei începe descărcarea
                            // Nu e nevoie să adaugi 'img' la DOM.
                            // Browserul îl va păstra în cache odată descărcat.
                        });
                    }

                    // apelul pentru colegi
                    const n = fetchedApartment.numberOfRooms;
                    api.get<Colleague[]>(
                        `/apartments/nearest_checkout/${id}`,
                        { params: { n } }
                    )
                        .then((res) => {
                            setColleaguesList(res.data);
                        })
                        .catch((err) => {
                            console.error("Eroare la preluarea colegilor:", err);
                        });
                })
                .catch((error) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", error);
                    setError("Apartamentul nu a fost gasit sau a aparut o eroare.");
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

    // Use useMemo to calculate costs only when relevant state changes
    const bookingCosts = useMemo(() => {
        return calculateBookingCosts(apartment, selectedDates, rooms.rooms);
    }, [apartment, user, selectedDates, rooms.rooms]);

    // Function to send reservation request
    const makeReservation = async () => {
        if (!apartment) {
            setError("Apartamentul nu a fost gasit.");
            return;
        }

        if (!selectedDates || !bookingCosts) {
            setError("Selectati mai intai intervalul dorit si asigurati-va ca datele sunt valide.");
            setShowReservationPopup(true);
            return;
        }

        if (!isAuthenticated || !user || !token) {
            setError("Trebuie sa fiti autentificat pentru a trimite o cerere de rezervare.");
            // Consider navigating to login: navigate('/login');
            return;
        }
        setError(""); // Clear previous errors
        try {
            await api.post(
                "/create_reservation_request",
                {
                    clientId: user._id,
                    apartmentId: id,
                    numberOfRooms: bookingCosts.numberOfRooms,
                    checkIn: format(selectedDates.checkIn, "yyyy-MM-dd"),
                    checkOut: format(selectedDates.checkOut, "yyyy-MM-dd"),
                    priceRent: apartment.price, // Pretul de baza per noapte per camera
                    priceUtilities: bookingCosts.totalDailyUtilityCost, // Costul zilnic al utilitatilor
                    discount: bookingCosts.discountPercentage, // Procentajul de discount aplicat
                    numberOfNights: bookingCosts.nights
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            // Handle successful request submission
            console.log("Reservation request sent successfully!");
            refresh(); // Refresh notifications
            alert("Cererea de rezervare a fost trimisa cu succes!"); // Simple confirmation
            // Optionally navigate to a confirmation or 'my requests' page

        } catch (err: any) {
            setError(
                err.response?.data?.message || "Eroare la trimiterea cererii. incercati din nou.",
            );
            console.error("Reservation Error:", err);
        }
    };

    // Function to handle map button click
    const handleLocationClick = async (apt: Apartment) => {
        setError(""); // Clear previous errors
        try {
            const response = await api.get("https://nominatim.openstreetmap.org/search", {
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
                setError("Nu s-au putut gasi coordonatele pentru aceasta locatie.");
            }
        } catch (error) {
            console.error("Eroare la obtinerea coordonatelor:", error);
            setError("Eroare la cautarea locatiei pe harta.");
        }
    };

    // Loading and initial error states
    if (!apartment && error) {
        return (
            <div>
                <div className="loading-error-container">
                    <p className="error">{error}</p>
                </div>
            </div>
        );
    }
    if (!apartment) {
        return (
            <div>
                <div className="loading-error-container">
                    <p>Se incarca detaliile apartamentului...</p>
                </div>
            </div>
        );
    }
    async function openChatWith(otherUserId: string) {
        const { data: conversation } = await api.post<{
            _id: string;
            participants: string[];
            isGroup: boolean;
            createdAt: string;
            lastMessageAt: string;
        }>('/conversations', {
            participants: [user!._id, otherUserId],
        });
        navigate(`/chat/${conversation._id}`);
    }
    // Helper function to render selected dates and costs (part of the new right section logic)
    const renderSelectedDatesInfo = () => {
        if (!selectedDates || !bookingCosts) { // Verificam si bookingCosts
            // Afiseaza un mesaj default sau nimic daca nu sunt selectate datele
            return (
                <div className="selected-dates-info">
                    <p>Selectați perioada și numărul de camere pentru a vedea costul.</p>
                    <button
                        className="owner-section-button"
                        onClick={selectInterval}
                        style={{
                            width: "161px",
                            marginTop: "15px",
                            display: "block",
                            margin: "15px auto 0 auto",
                        }}
                    >
                        Selecteaza Perioada
                    </button>
                </div>
            );
        }
        if (bookingCosts.nights <= 0) {
            return <p className="error booking-error">Interval de date invalid.</p>;
        }

        const nightsText = bookingCosts.nights === 1 ? "1 noapte" : `${bookingCosts.nights} nopti`;

        return (
            <div className="selected-dates-info">
                <p><span>Check-in:</span> {format(selectedDates.checkIn, "dd/MM/yyyy")}</p>
                <p><span>Check-out:</span> {format(selectedDates.checkOut, "dd/MM/yyyy")}</p>
                <hr className="line-divider short" />
                <p><span>Pret Cazare / camera ({nightsText}):</span> {bookingCosts.baseApartmentCostForPeriod.toFixed(2)} RON</p>
                <p><span>Costuri Extra Estim. ({nightsText}):</span> {(bookingCosts.totalUtilityCostForPeriod / bookingCosts.numberOfRooms).toFixed(2)} RON</p>
                <p><span>Numar camere:</span> {bookingCosts.numberOfRooms}</p>
                <hr className="line-divider short" />
                <p><span>Total Cazare ({bookingCosts.numberOfRooms} camere):</span> {bookingCosts.totalApartmentCostForPeriodAllRooms.toFixed(2)} RON</p>
                <p><span>Total Utilitati ({bookingCosts.numberOfRooms} camere):</span> {bookingCosts.totalUtilityCostForPeriod.toFixed(2)} RON</p>

                <hr className="line-divider short" />
                {bookingCosts.userHasValidDiscount && bookingCosts.discountPercentage > 0 && (
                    <p>
                        <span>Discount categorie medie ({bookingCosts.discountPercentage}%):</span> -{bookingCosts.discountAmount.toFixed(2)} RON
                    </p>
                )}
                <hr className="line-divider short bold" />
                <p className="total-price">
                    <span>Pret Total:</span> {bookingCosts.userHasValidDiscount ? bookingCosts.finalCostWithDiscount.toFixed(2) : bookingCosts.finalCostWithoutDiscount.toFixed(2)} RON
                </p>
                {!bookingCosts.userHasValidDiscount && bookingCosts.discountPercentage > 0 && (
                    <p className="info-text" style={{ fontSize: "0.8em", marginTop: "5px" }}>
                        (Prețul nu include reducerea de student deoarece media nu este validă sau nu se aplică.)
                    </p>
                )}


                <button
                    className="owner-section-button"
                    onClick={selectInterval}
                    style={{
                        width: "161px",
                        marginTop: "15px",
                        display: "block",
                        margin: "15px auto 0 auto",
                    }}
                >
                    Modifica intervalul
                </button>
            </div>
        );
    };

    const nextImage = () => {
        if (apartment && apartment.images) {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === apartment.images.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevImage = () => {
        if (apartment && apartment.images) {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === 0 ? apartment.images.length - 1 : prevIndex - 1
            );
        }
    };
    // Main component render
    return (
        <div className="apartment-details-page">
            <div className="details-container">
                {/* === Partea stanga (Imagine + Detalii Grupate) === */}
                <div className="left-section">
                    {/* Imaginea principala */}
                    <div className="image-carousel-container">
                        {apartment.images && apartment.images.length > 0 ? (
                            <>
                                {apartment.images.length > 1 && (
                                    <button onClick={prevImage} className="carousel-button prev">
                                        <FaLongArrowAltLeft /> {/* Săgeată stânga */}
                                    </button>
                                )}
                                <img
                                    src={blobUrls[currentImageIndex] ?? apartment.images[currentImageIndex]}
                                    alt={`Poza ${currentImageIndex + 1}`}
                                    className="carousel-image"
                                />
                                {apartment.images.length > 1 && (
                                    <button onClick={nextImage} className="carousel-button next">
                                        <FaLongArrowAltRight /> {/* Săgeată dreapta */}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="no-image-placeholder">
                                <p>Nu sunt poze disponibile.</p>
                            </div>
                        )}
                    </div>

                    {/* Titlu - Locatie si Pret */}
                    <div className="title-location-price">
                        <h2>Apartament in {apartment.location}</h2>
                        <p className="price-display">{apartment.price} RON / camera / noapte (fara reducere)</p>
                        <p>{apartment.price * ((100 - apartment.discount1) / 100)} RON / camera / noapte pentru studentii de categoria 1 ({apartment.discount1}% discount)</p>
                        <p>{apartment.price * ((100 - apartment.discount2) / 100)} RON / camera / noapte pentru studentii de categoria 2 ({apartment.discount2}% discount)</p>
                        <p>{apartment.price * ((100 - apartment.discount3) / 100)} RON / camera / noapte pentru studentii de categoria 3 ({apartment.discount3}% discount)</p>
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
                            <i className="fas fa-check-circle icon-prefix"></i>Facilitati
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
                        {colleaguesList.length > 0 && token != null ? (
                            colleaguesList.map(col => (
                                <p key={col._id}>
                                    <strong>{col.fullName}:</strong>{" "}
                                    checkIn: {format(parseISO(col.checkIn), "dd-MM-yyyy")};{" "}
                                    checkOut: {format(parseISO(col.checkOut), "dd-MM-yyyy")};{" "}
                                    Numar camere: {col.numberOfRooms}
                                </p>
                            ))
                        ) : (
                            <p>Niciunul momentan</p>
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
                                    <button className="owner-section-button chat-btn"
                                        onClick={() => openChatWith(apartment!.ownerInformation!._id)}>
                                        Chat
                                    </button>{" "}
                                    {/* Original Class */}
                                </div>
                            </div>
                            <hr className="line-divider thick" /> {/* Using new divider class */}
                            <div className="booking-section">
                                <h4>Verifica Disponibilitatea</h4>
                                {renderSelectedDatesInfo()}{" "}

                            </div>
                            <hr className="line-divider thick" /> {/* Using new divider class */}
                            {/* Error display */}
                            {error && <p className="error booking-error">{error}</p>}
                            {/* Using original reserve button class */}
                            <button
                                className="reserve-btn"
                                onClick={selectedDates ? makeReservation : selectInterval}
                                disabled={
                                    !isAuthenticated || // verific autentificarea
                                    !user!.faculty_valid // verific validarea facultatii
                                }
                                // disabled
                                title={
                                    !isAuthenticated
                                        ? "Trebuie sa fiti autentificat pentru a rezerva"
                                        : !user!.faculty_valid
                                            ? "Trebuie sa aveti facultatea validata pentru a rezerva"
                                            : selectedDates
                                                ? "Trimite Cerere Rezervare"
                                                : "Selectati perioada"
                                }
                            >
                                <span className="reserve-btn-text">
                                    {selectedDates ? "Trimite Cerere Rezervare" : "Rezerva Acum"}
                                </span>
                                <span className="reserve-btn-icon">
                                    <img src="/Poze_apartamente/booking.png" alt="Booking Icon" />
                                </span>
                            </button>
                            {!isAuthenticated && (
                                <p className="auth-warning">Autentifica-te pentru a rezerva</p>
                            )}
                            {isAuthenticated && user && !user.faculty_valid && (
                                <p className="booking-error" style={{ marginTop: "8px" }}>
                                    Trebuie sa iti validezi facultatea inainte de a rezerva.
                                </p>
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
