import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment } from "./types";
import "./ownerApartmentDetails.css"; // Vom crea acest fișier CSS

const OwnerApartmentDetails: React.FC = () => {
    const { token } = useContext(AuthContext);
    const { apartmentId } = useParams<{ apartmentId: string }>(); // Obține ID-ul din URL
    const navigate = useNavigate();

    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
    const [newPrice, setNewPrice] = useState<string>(""); // Prețul editat, ca string inițial
    const [isSaving, setIsSaving] = useState<boolean>(false);

    useEffect(() => {
        if (apartmentId && token) {
            setLoading(true);
            setError(null);
            api.get(`/apartments/${apartmentId}`, { // Asigură-te că ai un endpoint pentru a lua un apartament după ID
                headers: { Authorization: `Bearer ${token}` }
            })
                .then((response) => {
                    console.log("Detalii apartament:", response.data);
                    setApartment(response.data);
                    setNewPrice(response.data.price.toString()); // Inițializează newPrice cu prețul actual
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Eroare la preluarea detaliilor apartamentului:", err);
                    setError("Nu s-au putut încărca detaliile apartamentului.");
                    setLoading(false);
                });
        } else {
            setError("ID apartament sau token lipsă.");
            setLoading(false);
        }
    }, [apartmentId, token]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewPrice(e.target.value);
    };

    const handleSavePrice = async () => {
        if (!apartment || newPrice === "" || isNaN(parseFloat(newPrice))) {
            setError("Prețul introdus nu este valid.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const updatedApartmentData = { price: parseFloat(newPrice) };
            const response = await api.put(`/apartments/${apartment._id}`, updatedApartmentData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setApartment(response.data); // Actualizează cu datele primite de la server (care ar trebui să includă prețul nou)
            setIsEditingPrice(false);
            alert("Prețul a fost actualizat cu succes!");
        } catch (err) {
            console.error("Eroare la actualizarea prețului:", err);
            setError("Nu s-a putut actualiza prețul. Încearcă din nou.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (apartment) {
            setNewPrice(apartment.price.toString()); // Resetează la prețul original
        }
        setIsEditingPrice(false);
        setError(null); // Curăță orice eroare de validare
    };

    if (loading) {
        return <div className="apartment-details-container"><p>Se încarcă detaliile...</p></div>;
    }

    if (error && !apartment) { // Afișează eroarea doar dacă apartamentul nu s-a încărcat
        return <div className="apartment-details-container"><p className="error-message">{error}</p></div>;
    }

    if (!apartment) {
        return <div className="apartment-details-container"><p>Apartamentul nu a fost găsit.</p></div>;
    }

    // Similar cu OwnerApartments, gestionează imaginea
    const imageUrl = apartment.images && apartment.images.length > 0
        ? apartment.images[0]
        : "/Poze_apartamente/placeholder.jpeg";

    return (
        <div className="apartment-details-container">
            <button onClick={() => navigate(-1)} className="back-button">
                ← Înapoi la listă
            </button>
            <h1>Detalii Apartament: {apartment.location}</h1>

            <div className="apartment-content">
                <div className="apartment-image-gallery">
                    {/* Aici poți adăuga un carusel dacă ai mai multe imagini */}
                    <img src={imageUrl} alt={`Imagine ${apartment.location}`} className="main-apartment-image" />
                    {/* TODO: Adaugă thumbnails sau un carusel pentru apartment.images */}
                </div>

                <div className="apartment-info">
                    <p><strong>Locație:</strong> {apartment.location}</p>
                    {/* <p><strong>Descriere:</strong> {apartment.description || "N/A"}</p> */}
                    <p><strong>Dormitoare:</strong> {apartment.numberOfRooms || "N/A"}</p>
                    <p><strong>Băi:</strong> {apartment.numberOfBathrooms || "N/A"}</p>
                    <p><strong>Suprafață:</strong> {apartment.totalSurface ? `${apartment.totalSurface} mp` : "N/A"}</p>

                    <div className="price-section">
                        <strong>Preț: </strong>
                        {isEditingPrice ? (
                            <>
                                <input
                                    type="number"
                                    value={newPrice}
                                    onChange={handlePriceChange}
                                    className="price-input"
                                    disabled={isSaving}
                                />
                                <span> RON / camera / noapte</span>
                                <button onClick={handleSavePrice} className="save-button" disabled={isSaving}>
                                    {isSaving ? "Se salvează..." : "Salvează"}
                                </button>
                                <button onClick={handleCancelEdit} className="cancel-button" disabled={isSaving}>
                                    Anulează
                                </button>
                            </>
                        ) : (
                            <>
                                <span>{apartment.price} RON / camera / noapte</span>
                                <button onClick={() => setIsEditingPrice(true)} className="edit-button">
                                    Modifică Prețul
                                </button>
                            </>
                        )}
                    </div>
                    {error && <p className="error-message edit-error">{error}</p>} {/* Eroare specifică editării */}

                    {/* Aici poți adăuga și alte câmpuri pe care vrei să le editezi, urmând un model similar */}
                </div>
            </div>
        </div>
    );
};

export default OwnerApartmentDetails;