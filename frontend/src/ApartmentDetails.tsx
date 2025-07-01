import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from "./api";
import { Apartment } from "./types";
import { AuthContext } from "./authenticate/AuthContext";
import OwnerPop_up from "./OwnerPop_up";
import ReservationPopup from "./ReservationPopup";
import { format, parseISO } from "date-fns";
import "leaflet/dist/leaflet.css";
import "./reviews/Reviews.css";
import MapPop_up from "./MapPop_up";
import { useNotifications } from "./NotificationContext";
import { FaLongArrowAltLeft, FaLongArrowAltRight } from "react-icons/fa";
import "./ApartmentDetails.css";
import { SelectedDates, Colleague, calculateBookingCosts } from "../utils/RentalDetailsTypes";
import { ALL_POSSIBLE_FACILITIES_MAP } from "./types";
import ReviewList from "./reviews/ReviewList";
import ReviewForm from "./reviews/ReviewForm";
import { Review, PaginatedResponse } from "./types";
import { useInitiatePrivateChat } from "./hooks/useInitiateChat";

const ApartmentDetails: React.FC = () => {

    const { refresh } = useNotifications();
    const { id } = useParams<{ id: string }>();
    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [rooms, setRooms] = useState<{ rooms: number }>({ rooms: 0 });
    const [error, setError] = useState("");
    const { isAuthenticated, user, token } = useContext(AuthContext);
    const [colleaguesList, setColleaguesList] = useState<Colleague[]>([]);
    const { isLoadingPrivate, initiatePrivateChat } = useInitiatePrivateChat();

    // stari pentru facilitati
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
    const [reviewError, setReviewError] = useState<string>("");
    const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
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

    const [canLeaveReview, setCanLeaveReview] = useState<boolean>(false);

    const handleReviewDeleted = (deletedReviewId: string) => {
        setReviews((prevReviews) => prevReviews.filter((review) => review._id !== deletedReviewId));

        if (id) {
            api.get<Apartment>(`/apartments/${id}`)
                .then((response) => setApartment(response.data))
                .catch((err) =>
                    console.error(
                        "Eroare la re-preluarea detaliilor apartamentului dupa stergere review:",
                        err,
                    ),
                );
        }
    };

    const handleDatesSelected = (checkIn: Date, checkOut: Date, rooms: number) => {
        setSelectedDates({ checkIn, checkOut });
        setRooms({ rooms });
        setError("");
    };

    useEffect(() => {
        if (!apartment?.images?.length) return;
        Promise.all(
            apartment.images.map((src) =>
                fetch(src)
                    .then((res) => res.blob())
                    .then((blob) => URL.createObjectURL(blob)),
            ),
        )
            .then((urls) => setBlobUrls(urls))
            .catch((err) => console.error("Nu am putut incarca imaginea:", err));
    }, [apartment?.images]);

    useEffect(() => {
        return () => {
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [blobUrls]);

    useEffect(() => {
        if (id) {
            api.get<Apartment>(`/apartments/${id}`)
                .then((response) => {
                    const fetchedApartment = response.data;
                    setApartment(fetchedApartment);
                    setCurrentImageIndex(0);
                    const initialFacilitiesLabels: string[] = [];
                    if (fetchedApartment.facilities) {
                        ALL_POSSIBLE_FACILITIES_MAP.forEach((facilityMapItem) => {
                            if (fetchedApartment.facilities[facilityMapItem.key] === true) {
                                initialFacilitiesLabels.push(facilityMapItem.label);
                            }
                        });
                    }
                    setSelectedFacilities(initialFacilitiesLabels);
                    if (fetchedApartment.images && fetchedApartment.images.length > 0) {
                        fetchedApartment.images.forEach((imageUrl) => {
                            const img = new Image();
                            img.src = imageUrl;
                        });
                    }
                    const n = fetchedApartment.numberOfRooms;
                    api.get<Colleague[]>(`/apartments/nearest_checkout/${id}`, { params: { n } })
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


    useEffect(() => {
        if (id) {
            setLoadingReviews(true);
            setReviewError("");

            api.get<PaginatedResponse<Review>>(
                `/reviews/apartment/${id}?sort=createdAt_desc&limit=1000`,
            )
                .then((response) => {
                    if (Array.isArray(response.data)) {

                        setReviews(response.data);
                    } else if (response.data && Array.isArray(response.data.reviews)) {

                        setReviews(response.data.reviews);
                    } else {
                        console.warn(
                            "Format neasteptat pentru review-uri de la API:",
                            response.data,
                        );
                        setReviews([]);
                        setReviewError("Formatul datelor primite pentru review-uri este incorect.");
                        setReviews([]);
                    }
                })
                .catch((error) => {
                    console.error("Eroare la preluarea review-urilor:", error);
                    setReviewError("Nu s-au putut incarca review-urile.");
                })
                .finally(() => {
                    setLoadingReviews(false);
                });

            api.get<boolean>(`/users/can-review/${id}`)
                .then((response) => {
                    setCanLeaveReview(response.data);
                })
                .catch((error) => {
                    console.error("Eroare la verificarea permisiunilor de review:", error);
                });

        } else {
            setReviews([]);
        }
    }, [id]);

    const handleReviewSubmitted = (newReview: Review) => {

        setReviews((prevReviews) => [newReview, ...prevReviews]);
        setShowReviewForm(false);
    };

    useEffect(() => {
        if (showOwnerPop_up || showReservationPopup || selectedMapData) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showOwnerPop_up, showReservationPopup, selectedMapData]);

    const selectInterval = async () => {
        setShowReservationPopup(true);
    };

    const bookingCosts = useMemo(() => {
        return calculateBookingCosts(apartment, selectedDates, rooms.rooms);
    }, [apartment, user, selectedDates, rooms.rooms]);

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
            return;
        }
        setError("");
        try {
            await api.post(
                "/create_reservation_request",
                {
                    clientId: user._id,
                    apartmentId: id,
                    numberOfRooms: bookingCosts.numberOfRooms,
                    checkIn: format(selectedDates.checkIn, "yyyy-MM-dd"),
                    checkOut: format(selectedDates.checkOut, "yyyy-MM-dd"),
                    priceRent: apartment.price,
                    priceUtilities: bookingCosts.totalDailyUtilityCost,
                    discount: bookingCosts.discountPercentage,
                    numberOfNights: bookingCosts.nights,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            refresh();
            setSelectedDates(null);
            alert("Cererea de rezervare a fost trimisa cu succes!");

        } catch (err: any) {
            setError(
                err.response?.data?.message || "Eroare la trimiterea cererii. incercati din nou.",
            );
            console.error("Reservation Error:", err);
        }
    };

    const handleLocationClick = async (apt: Apartment) => {
        setError("");
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
                const parsedLat = parseFloat(lat);
                const parsedLng = parseFloat(lon);

                if (!isNaN(parsedLat) && !isNaN(parsedLng)) {

                    setSelectedMapData({
                        lat: parsedLat,
                        lng: parsedLng,
                        address: apt.location,
                    });
                } else {
                    console.error("Coordonate invalide primite de la Nominatim:", lat, lon);
                    setError("Nu s-au putut obtine coordonate valide pentru harta.");
                }
            }
        } catch (error) {
            console.error("Eroare la obtinerea coordonatelor:", error);
            setError("Eroare la cautarea locatiei pe harta.");
        }
    };

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

    const renderSelectedDatesInfo = () => {
        if (!selectedDates || !bookingCosts) {


            return (
                <div className="selected-dates-info">
                    <p>Selectati perioada si numarul de camere pentru a vedea costul.</p>
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
                <p>
                    <span>Check-in:</span> {format(selectedDates.checkIn, "dd/MM/yyyy")}
                </p>
                <p>
                    <span>Check-out:</span> {format(selectedDates.checkOut, "dd/MM/yyyy")}
                </p>
                <hr className="line-divider short" />
                <p>
                    <span>Pret Cazare / camera ({nightsText}):</span>{" "}
                    {bookingCosts.baseApartmentCostForPeriod.toFixed(2)} RON
                </p>
                <p>
                    <span>Costuri Extra Estim. ({nightsText}):</span>{" "}
                    {(bookingCosts.totalUtilityCostForPeriod / bookingCosts.numberOfRooms).toFixed(
                        2,
                    )}{" "}
                    RON
                </p>
                <p>
                    <span>Numar camere:</span> {bookingCosts.numberOfRooms}
                </p>
                <hr className="line-divider short" />
                <p>
                    <span>Total Cazare ({bookingCosts.numberOfRooms} camere):</span>{" "}
                    {bookingCosts.totalApartmentCostForPeriodAllRooms.toFixed(2)} RON
                </p>
                <p>
                    <span>Total Utilitati ({bookingCosts.numberOfRooms} camere):</span>{" "}
                    {bookingCosts.totalUtilityCostForPeriod.toFixed(2)} RON
                </p>

                <hr className="line-divider short" />
                {bookingCosts.userHasValidDiscount && bookingCosts.discountPercentage > 0 && (
                    <p>
                        <span>Discount categorie medie ({bookingCosts.discountPercentage}%):</span>{" "}
                        -{bookingCosts.discountAmount.toFixed(2)} RON
                    </p>
                )}
                <hr className="line-divider short bold" />
                <p className="total-price">
                    <span>Pret Total:</span>{" "}
                    {bookingCosts.userHasValidDiscount
                        ? bookingCosts.finalCostWithDiscount.toFixed(2)
                        : bookingCosts.finalCostWithoutDiscount.toFixed(2)}{" "}
                    RON
                </p>
                {!bookingCosts.userHasValidDiscount && bookingCosts.discountPercentage > 0 && (
                    <p className="info-text" style={{ fontSize: "0.8em", marginTop: "5px" }}>
                        (Pretul nu include reducerea de student deoarece media nu este valida sau nu
                        se aplica.)
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
                prevIndex === apartment.images.length - 1 ? 0 : prevIndex + 1,
            );
        }
    };

    const prevImage = () => {
        if (apartment && apartment.images) {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === 0 ? apartment.images.length - 1 : prevIndex - 1,
            );
        }
    };

    return (
        <div className="apartment-details-page">
            <div className="details-container">
                <div className="left-section">
                    <div className="image-carousel-container">
                        {apartment.images && apartment.images.length > 0 ? (
                            <>
                                {apartment.images.length > 1 && (
                                    <button onClick={prevImage} className="carousel-button prev">
                                        <FaLongArrowAltLeft />
                                    </button>
                                )}
                                <img
                                    src={
                                        blobUrls[currentImageIndex] ??
                                        apartment.images[currentImageIndex]
                                    }
                                    alt={`Poza ${currentImageIndex + 1}`}
                                    className="carousel-image"
                                />
                                {apartment.images.length > 1 && (
                                    <button onClick={nextImage} className="carousel-button next">
                                        <FaLongArrowAltRight />
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
                        <p className="price-display">
                            {apartment.price} RON / camera / noapte (fara reducere)
                        </p>
                        <p>
                            {apartment.price * ((100 - apartment.discounts.discount1) / 100)} RON /
                            camera / noapte pentru studentii de categoria 1 (
                            {apartment.discounts.discount1}% discount)
                        </p>
                        <p>
                            {apartment.price * ((100 - apartment.discounts.discount2) / 100)} RON /
                            camera / noapte pentru studentii de categoria 2 (
                            {apartment.discounts.discount2}% discount)
                        </p>
                        <p>
                            {apartment.price * ((100 - apartment.discounts.discount3) / 100)} RON /
                            camera / noapte pentru studentii de categoria 3 (
                            {apartment.discounts.discount3}% discount)
                        </p>
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

                        <ul className="facilities-list-display">
                            {selectedFacilities.map((label) => (
                                <li key={label}>{label}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Grup Costuri Extra Estimate (Lunare / Zilnice - clarificam) */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-coins icon-prefix"></i>Costuri Extra Estimate
                            (lunar)
                        </h3>

                        <p>
                            <span>Internet:</span> {apartment.utilities.internetPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>TV:</span> {apartment.utilities.TVPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>Apa (estimat):</span> {apartment.utilities.waterPrice ?? "N/A"}{" "}
                            RON
                        </p>
                        <p>
                            <span>Gaz (estimat):</span> {apartment.utilities.gasPrice ?? "N/A"} RON
                        </p>
                        <p>
                            <span>Electricitate (estimat):</span>{" "}
                            {apartment.utilities.electricityPrice ?? "N/A"} RON
                        </p>
                    </div>

                    {/* Grup Colegi */}
                    <div className="detail-group">
                        <h3>
                            <i className="fas fa-users icon-prefix"></i>Colegi de Apartament
                        </h3>
                        {colleaguesList.length > 0 && token != null ? (
                            colleaguesList.map((col) => (
                                <p key={col._id}>
                                    <strong>{col.faculty}:</strong> checkIn:{" "}
                                    {format(parseISO(col.checkIn), "dd-MM-yyyy")}; checkOut:{" "}
                                    {format(parseISO(col.checkOut), "dd-MM-yyyy")}; Numar camere:{" "}
                                    {col.numberOfRooms}
                                </p>
                            ))
                        ) : (
                            <p>Niciunul momentan</p>
                        )}
                    </div>

                    <div className="reviews-wrapper-card">
                        <section className="reviews-section">
                            <h2>Recenzii ({reviews.length})</h2>

                            {isAuthenticated && canLeaveReview && !showReviewForm && (
                                <button
                                    onClick={() => setShowReviewForm(true)}
                                    className="button-add-review"
                                >
                                    Adauga o Recenzie
                                </button>
                            )}
                            {showReviewForm && apartment && user && (
                                <ReviewForm
                                    apartmentId={apartment._id}
                                    onReviewSubmitted={handleReviewSubmitted}
                                    onCancel={() => setShowReviewForm(false)}
                                />
                            )}
                            {loadingReviews && <p>Se incarca recenziile...</p>}
                            {reviewError && <p className="error">{reviewError}</p>}
                            {!loadingReviews && !reviewError && (
                                <ReviewList
                                    reviews={reviews}
                                    currentUserId={user?._id || null}
                                    onReviewDeleted={handleReviewDeleted}
                                />
                            )}
                        </section>
                    </div>
                </div>

                {/* === New Right Section Structure with Original Button Styles === */}
                <div className="right-section">
                    {apartment.ownerInformation && (
                        <div className="owner-booking-card">
                            <div className="owner-info-header">
                                <h3>Proprietar</h3>
                                <p>{apartment.ownerInformation.fullName}</p>

                                <div className="owner-buttons">
                                    <button
                                        className="owner-section-button details-btn"
                                        onClick={() => setshowOwnerPop_up(true)}
                                    >
                                        Detalii
                                    </button>
                                    <button
                                        className="owner-section-button chat-btn"
                                        onClick={() => initiatePrivateChat(apartment!.ownerInformation!._id)}
                                        disabled={isLoadingPrivate}
                                    >
                                        Chat
                                    </button>{" "}

                                </div>
                            </div>
                            <hr className="line-divider thick" />
                            <div className="booking-section">
                                <h4>Verifica Disponibilitatea</h4>
                                {renderSelectedDatesInfo()}{" "}
                            </div>
                            <hr className="line-divider thick" />
                            {error && <p className="error booking-error">{error}</p>}
                            <button
                                className="reserve-btn"
                                onClick={selectedDates ? makeReservation : selectInterval}
                                disabled={
                                    !isAuthenticated ||
                                    !user!.faculty_valid
                                }
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
                    onClose={() => setshowOwnerPop_up(false)}
                />
            )}
            {selectedMapData &&
                typeof selectedMapData.lat === "number" &&
                typeof selectedMapData.lng === "number" && (
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
