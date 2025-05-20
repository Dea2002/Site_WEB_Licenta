import React, { useState, useEffect, useContext, useCallback, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment, Discount, UtilityPrice, Rental } from "./types";
import "./OwnerApartmentDetails.css"; // Asigura-te ca CSS-ul este actualizat

// O lista predefinita de facilitati posibile
const ALL_POSSIBLE_FACILITIES = [
    "Wi-Fi", "Parcare Gratuita", "Aer Conditionat", "TV Cablu",
    "Masina de spalat rufe", "Bucatarie complet utilata", "Balcon/Terasa",
    "Permite animale", "Zona de lucru dedicata", "Piscina", "Sala de fitness"
];

interface PaginatedRentals {
};

const OwnerApartmentDetails: React.FC = () => {
    const { token } = useContext(AuthContext);
    const { apartmentId } = useParams<{ apartmentId: string }>();
    const navigate = useNavigate();

    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({}); // Pentru stari de salvare per sectiune

    // Stari pentru editare
    const [editableMainPrice, setEditableMainPrice] = useState<string>("");
    const [editableDiscount1, setEditableDiscount1] = useState<string>("");
    const [editableDiscount2, setEditableDiscount2] = useState<string>("");
    const [editableDiscount3, setEditableDiscount3] = useState<string>("");

    const [isEditingMainPrice, setIsEditingMainPrice] = useState<boolean>(false);
    const [isEditingDiscount1, setIsEditingDiscount1] = useState<boolean>(false);
    const [isEditingDiscount2, setIsEditingDiscount2] = useState<boolean>(false);
    const [isEditingDiscount3, setIsEditingDiscount3] = useState<boolean>(false);

    const [editableDiscounts, setEditableDiscounts] = useState<Discount[]>([]);

    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
    const [isEditingFacilities, setIsEditingFacilities] = useState<boolean>(false);

    const [editableUtilityPrices, setEditableUtilityPrices] = useState<UtilityPrice[]>([]);
    const [isEditingUtilityPrices, setIsEditingUtilityPrices] = useState<boolean>(false);

    const [editableRenovationYear, setEditableRenovationYear] = useState<string>("");
    const [isEditingRenovationYear, setIsEditingRenovationYear] = useState<boolean>(false);

    // Imagini
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

    // Chiriasi
    const [currentRentals, setCurrentRentals] = useState<Rental[]>([]);
    const [rentalHistory, setRentalHistory] = useState<PaginatedRentals | null>(null);
    const [loadingRentals, setLoadingRentals] = useState<boolean>(false);
    const [rentalHistoryPage, setRentalHistoryPage] = useState<number>(1);

    // --- FETCH DATA ---
    const fetchApartmentData = useCallback(async () => {
        if (!apartmentId || !token) {
            setError("ID apartament sau token invalid.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<Apartment>(`/apartments/${apartmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const aptData = response.data;
            setApartment(aptData);
            setEditableMainPrice(aptData.price.toString());
            setEditableDiscount1(aptData.discount1.toString() || "");
            setEditableDiscount2(aptData.discount2.toString() || "");
            setEditableDiscount3(aptData.discount3.toString() || "");
            setEditableDiscounts(aptData.discounts ? JSON.parse(JSON.stringify(aptData.discounts)) : []); // Deep copy
            setSelectedFacilities(aptData.facilities ? [...aptData.facilities] : []);
            setEditableUtilityPrices(aptData.utilityPrices ? JSON.parse(JSON.stringify(aptData.utilityPrices)) : []); // Deep copy
            setEditableRenovationYear(aptData.renovationYear?.toString() || "");
        } catch (err: any) {
            console.error("Eroare la preluarea detaliilor apartamentului:", err);
            setError(err.response?.data?.message || "Nu s-au putut incarca detaliile apartamentului.");
        } finally {
            setLoading(false);
        }
    }, [apartmentId, token]);

    const fetchCurrentRentals = useCallback(async () => {
        if (!apartmentId || !token) return;
        setLoadingRentals(true);
        try {
            const response = await api.get<Rental[]>(`/rentals/apartment/${apartmentId}/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentRentals(response.data);
        } catch (err) {
            console.error("Eroare la preluarea chiriilor actuale:", err);
        } finally {
            setLoadingRentals(false);
        }
    }, [apartmentId, token]);

    const fetchRentalHistory = useCallback(async (page: number = 1) => {
        if (!apartmentId || !token) return;
        setLoadingRentals(true);
        try {
            const response = await api.get<PaginatedRentals>(`/apartments/rentals/${apartmentId}/history?page=${page}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Istoricul chiriilor:", response.data);
            setRentalHistory(response.data);
            setRentalHistoryPage(response.data.currentPage);
        } catch (err) {
            console.error("Eroare la preluarea istoricului chiriilor:", err);
        } finally {
            setLoadingRentals(false);
        }
    }, [apartmentId, token]);

    useEffect(() => {
        fetchApartmentData();
    }, [fetchApartmentData]);

    useEffect(() => {
        if (apartment?._id) {
            fetchCurrentRentals();
            fetchRentalHistory(1);
        }
    }, [apartment?._id, fetchCurrentRentals, fetchRentalHistory]);


    // --- GENERIC SAVE FUNCTION ---
    const handleSaveSection = async (fieldName: keyof Apartment, data: any, sectionKey: string, editModeSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
        if (!apartment) return;
        setIsSaving(prev => ({ ...prev, [sectionKey]: true }));
        setError(null);
        try {
            const payload = { [fieldName]: data };
            const response = await api.put<Apartment>(`/apartments/${apartment._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApartment(response.data); // Actualizeaza tot obiectul apartment
            // Actualizeaza si starile locale de editare daca e necesar pentru consistenta vizuala imediata
            if (fieldName === 'price') setEditableMainPrice(response.data.price.toString());
            if (fieldName === 'discounts') setEditableDiscounts(response.data.discounts ? JSON.parse(JSON.stringify(response.data.discounts)) : []);
            if (fieldName === 'facilities') setSelectedFacilities(response.data.facilities ? [...response.data.facilities] : []);
            if (fieldName === 'utilityPrices') setEditableUtilityPrices(response.data.utilityPrices ? JSON.parse(JSON.stringify(response.data.utilityPrices)) : []);
            if (fieldName === 'renovationYear') setEditableRenovationYear(response.data.renovationYear?.toString() || "");

            editModeSetter(false); // Iesi din modul de editare pentru sectiunea respectiva
            alert(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} actualizat(a) cu succes!`);
        } catch (err: any) {
            console.error(`Eroare la actualizarea ${sectionKey}:`, err);
            setError(err.response?.data?.message || `Nu s-a putut actualiza ${sectionKey}.`);
        } finally {
            setIsSaving(prev => ({ ...prev, [sectionKey]: false }));
        }
    };

    const handleCancelEdit = (
        sectionKey: keyof Apartment,
        editModeSetter: React.Dispatch<React.SetStateAction<boolean>>,
        resetFunction: () => void
    ) => {
        resetFunction(); // Reseteaza datele editabile la cele originale din `apartment`
        editModeSetter(false);
        setError(null);
    };

    // --- PRICE ---
    const resetPrice = () => apartment && setEditableMainPrice(apartment.price.toString());
    const resetDiscount1 = () => apartment && setEditableDiscount1(apartment.discount1.toString());
    const resetDiscount2 = () => apartment && setEditableDiscount2(apartment.discount2.toString());
    const resetDiscount3 = () => apartment && setEditableDiscount3(apartment.discount3.toString());

    const savePrice = () => {
        if (isNaN(parseFloat(editableMainPrice)) || parseFloat(editableMainPrice) < 0) {
            setError("Pretul trebuie sa fie un numar pozitiv.");
            return;
        }
        handleSaveSection('price', parseFloat(editableMainPrice), 'Pret', setIsEditingMainPrice);
    }

    const saveDiscount1 = () => {
        if (isNaN(parseFloat(editableDiscount1)) || parseFloat(editableDiscount1) < 0) {
            setError("Discountul trebuie sa fie un numar pozitiv.");
            return;
        }
        handleSaveSection('discount1', parseFloat(editableDiscount1), 'discount1', setIsEditingDiscount1);
    }

    const saveDiscount2 = () => {
        if (isNaN(parseFloat(editableDiscount2)) || parseFloat(editableDiscount2) < 0) {
            setError("Discountul trebuie sa fie un numar pozitiv.");
            return;
        }
        handleSaveSection('discount2', parseFloat(editableDiscount2), 'discount2', setIsEditingDiscount2);
    }

    const saveDiscount3 = () => {
        if (isNaN(parseFloat(editableDiscount3)) || parseFloat(editableDiscount3) < 0) {
            setError("Discountul trebuie sa fie un numar pozitiv.");
            return;
        }
        handleSaveSection('discount3', parseFloat(editableDiscount3), 'discount3', setIsEditingDiscount3);
    }

    // --- DISCOUNTS ---
    const resetDiscounts = () => apartment && setEditableDiscounts(apartment.discounts ? JSON.parse(JSON.stringify(apartment.discounts)) : []);
    const handleDiscountChange = (index: number, field: keyof Discount, value: any) => {
        const newDiscounts = [...editableDiscounts];
        // @ts-ignore
        newDiscounts[index][field] = field === 'percentage' ? Number(value) : value;
        setEditableDiscounts(newDiscounts);
    };
    const addDiscount = () => setEditableDiscounts([...editableDiscounts, { percentage: 0, startDate: '', endDate: '', description: '' }]);
    const removeDiscount = (index: number) => setEditableDiscounts(editableDiscounts.filter((_, i) => i !== index));
    const saveDiscounts = () => {
        // Adauga validare pentru discounturi (date, procente)
        if (editableDiscounts.some(d => !d.startDate || !d.endDate || d.percentage <= 0 || d.percentage > 100)) {
            setError("Toate discounturile trebuie sa aiba date valide si un procentaj intre 1 si 100.");
            return;
        }
        handleSaveSection('discounts', editableDiscounts, 'Discounturi', setIsEditingDiscounts);
    }

    // --- IMAGES ---
    const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImageFiles(prevFiles => [...prevFiles, ...filesArray]);

            const previewsArray = filesArray.map(file => URL.createObjectURL(file));
            setImagePreviews(prevPreviews => [...prevPreviews, ...previewsArray]);
        }
    };
    const removeNewImagePreview = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            newPreviews.forEach(url => { if (imagePreviews.includes(url)) URL.revokeObjectURL(url) }); // Clean up old preview
            return newPreviews;
        });
    };
    const uploadImages = async () => {
        if (imageFiles.length === 0 || !apartment) return;
        setIsUploadingImages(true);
        setError(null);
        const formData = new FormData();
        imageFiles.forEach(file => formData.append('images', file)); // 'images' trebuie sa fie numele asteptat de backend

        try {
            const response = await api.post<Apartment>(`/apartments/${apartment._id}/images`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setApartment(response.data); // Backend-ul ar trebui sa returneze apartamentul actualizat cu noile URL-uri
            setImageFiles([]);
            imagePreviews.forEach(url => URL.revokeObjectURL(url)); // Clean up
            setImagePreviews([]);
            alert("Imaginile au fost incarcate cu succes!");
        } catch (err: any) {
            console.error("Eroare la incarcarea imaginilor:", err);
            setError(err.response?.data?.message || "Eroare la incarcarea imaginilor.");
        } finally {
            setIsUploadingImages(false);
        }
    };
    const deleteExistingImage = async (imageUrl: string) => {
        if (!apartment || !window.confirm("Sigur doriti sa stergeti aceasta imagine?")) return;
        setIsSaving(prev => ({ ...prev, deleteImage: true }));
        try {
            // Presupunem un endpoint care primeste URL-ul imaginii de sters
            // sau trimitem intreaga lista de imagini actualizata la endpoint-ul PUT general
            const updatedImages = apartment.images.filter(img => img !== imageUrl);
            const response = await api.put<Apartment>(`/apartments/${apartment._id}`, { images: updatedImages }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApartment(response.data);
            alert("Imagine stearsa cu succes!");
        } catch (err: any) {
            console.error("Eroare la stergerea imaginii:", err);
            setError(err.response?.data?.message || "Eroare la stergerea imaginii.");
        } finally {
            setIsSaving(prev => ({ ...prev, deleteImage: false }));
        }
    };

    // --- FACILITIES ---
    const resetFacilities = () => apartment && setSelectedFacilities(apartment.facilities ? [...apartment.facilities] : []);
    const handleFacilityToggle = (facility: string) => {
        setSelectedFacilities(prev =>
            prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
        );
    };
    const saveFacilities = () => handleSaveSection('facilities', selectedFacilities, 'Facilitati', setIsEditingFacilities);

    // --- UTILITY PRICES ---
    const resetUtilityPrices = () => apartment && setEditableUtilityPrices(apartment.utilityPrices ? JSON.parse(JSON.stringify(apartment.utilityPrices)) : []);
    const handleUtilityPriceChange = (index: number, field: keyof UtilityPrice, value: any) => {
        const newUtilityPrices = [...editableUtilityPrices];
        const utility = newUtilityPrices[index];
        if (field === 'price') utility.price = Number(value);
        else if (field === 'isIncludedInRent') utility.isIncludedInRent = Boolean(value);
        else if (field === 'name' || field === 'unit') utility[field] = String(value);
        setEditableUtilityPrices(newUtilityPrices);
    };
    const addUtilityPrice = () => setEditableUtilityPrices([...editableUtilityPrices, { name: '', price: 0, unit: '', isIncludedInRent: false }]);
    const removeUtilityPrice = (index: number) => setEditableUtilityPrices(editableUtilityPrices.filter((_, i) => i !== index));
    const saveUtilityPrices = () => {
        // Adauga validare
        if (editableUtilityPrices.some(up => !up.name || !up.unit || up.price < 0)) {
            setError("Toate utilitatile trebuie sa aiba nume, unitate si pret pozitiv.");
            return;
        }
        handleSaveSection('utilityPrices', editableUtilityPrices, 'Preturi Utilitati', setIsEditingUtilityPrices);
    }

    // --- RENOVATION YEAR ---
    const resetRenovationYear = () => apartment && setEditableRenovationYear(apartment.renovationYear?.toString() || "");
    const saveRenovationYear = () => {
        const year = parseInt(editableRenovationYear);
        if (editableRenovationYear && (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 5)) {
            setError("Anul renovarii nu este valid.");
            return;
        }
        handleSaveSection('renovationYear', editableRenovationYear ? year : null, 'An Renovare', setIsEditingRenovationYear);
    }

    // --- RENTALS ACTIONS ---
    const handleCancelRental = async (rentalId: string) => {
        if (!window.confirm("Sunteti sigur ca doriti sa anulati aceasta chirie?")) return;
        setIsSaving(prev => ({ ...prev, cancelRental: true }));
        try {
            // Presupunem un endpoint PATCH pentru anulare
            await api.patch(`/rentals/${rentalId}/cancel-by-owner`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Chiria a fost anulata.");
            fetchCurrentRentals(); // Reincarca lista de chirii actuale
            fetchRentalHistory(rentalHistoryPage); // Reincarca si istoricul
        } catch (err: any) {
            console.error("Eroare la anularea chiriei:", err);
            setError(err.response?.data?.message || "Nu s-a putut anula chiria.");
        } finally {
            setIsSaving(prev => ({ ...prev, cancelRental: false }));
        }
    };

    // --- DELETE APARTMENT ---
    const handleDeleteApartment = async () => {
        if (!apartment || !window.confirm("ATENtIE! Sigur doriti sa stergeti definitiv acest apartament si toate datele asociate (chirii, etc.)? Aceasta actiune este ireversibila!")) return;
        setIsSaving(prev => ({ ...prev, deleteApartment: true }));
        try {
            await api.delete(`/apartments/${apartment._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Apartamentul a fost sters cu succes.");
            navigate("/owner/apartments");
        } catch (err: any) {
            console.error("Eroare la stergerea apartamentului:", err);
            setError(err.response?.data?.message || "Nu s-a putut sterge apartamentul.");
        } finally {
            setIsSaving(prev => ({ ...prev, deleteApartment: false }));
        }
    };


    // --- RENDER LOGIC ---
    if (loading && !apartment) return <div className="owner-apartment-details-container"><p>Se incarca detaliile...</p></div>;
    if (!apartment) return <div className="owner-apartment-details-container"><p className="error-message">{error || "Apartamentul nu a fost gasit."}</p></div>;

    return (
        <div className="owner-apartment-details-container">
            <button onClick={() => navigate("/owner/apartments")} className="back-button general-button">
                ← inapoi la lista
            </button>
            <h1>Editare Apartament: {apartment.location}</h1>
            {error && <p className="error-message global-error-details">{error}</p>}

            {/* --- General Info (Non-editable here, except price) --- */}
            <section className="details-section">
                <h2>Informatii Generale</h2>
                <p><strong>Locatie:</strong> {apartment.location}</p>
                <p><strong>Camere:</strong> {apartment.numberOfRooms || "N/A"}</p>
                <p><strong>Bai:</strong> {apartment.numberOfBathrooms || "N/A"}</p>
                <p><strong>Suprafata:</strong> {apartment.totalSurface || "N/A"} mp</p>
            </section>

            {/* --- Discounts Section --- */}
            <section className="details-section">
                <h2>Preturi si discounturi</h2>
                <div className="editable-field">
                    <strong>Pret principal: </strong>
                    {isEditingMainPrice ? (
                        <>
                            <input type="number" value={editableMainPrice} onChange={(e) => setEditableMainPrice(e.target.value)} disabled={isSaving.Pret} /> RON/camera/noapte{" "}
                            <button onClick={savePrice} disabled={isSaving.Pret} className="save-button general-button">{isSaving.Pret ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit('price', setIsEditingMainPrice, resetPrice)} disabled={isSaving.Pret} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.price} RON/camera/noapte </span>
                            <button onClick={() => setIsEditingMainPrice(true)} className="edit-button general-button">Modifica</button>
                        </>
                    )}

                    <hr className="line-divider short" />

                    <strong>Discount categoria 1 (9.50 - 10.00): </strong>
                    {isEditingDiscount1 ? (
                        <>
                            <input type="number" value={editableDiscount1} onChange={(e) => setEditableDiscount1(e.target.value)} disabled={isSaving.discount1} /> %{" "}
                            <button onClick={saveDiscount1} disabled={isSaving.discount1} className="save-button general-button">{isSaving.discount1 ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit('discount1', setIsEditingDiscount1, resetDiscount1)} disabled={isSaving.discount1} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.discount1} % </span>
                            <button onClick={() => setIsEditingDiscount1(true)} className="edit-button general-button">Modifica</button>
                        </>
                    )}

                    <hr className="line-divider short" />

                    <strong>Discount categoria 2 (9.00 - 9.49): </strong>
                    {isEditingDiscount2 ? (
                        <>
                            <input type="number" value={editableDiscount2} onChange={(e) => setEditableDiscount2(e.target.value)} disabled={isSaving.discount2} /> %{" "}
                            <button onClick={saveDiscount2} disabled={isSaving.discount2} className="save-button general-button">{isSaving.discount2 ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit('discount2', setIsEditingDiscount2, resetDiscount2)} disabled={isSaving.discount2} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.discount2} % </span>
                            <button onClick={() => setIsEditingDiscount2(true)} className="edit-button general-button">Modifica</button>
                        </>
                    )}

                    <hr className="line-divider short" />

                    <strong>Discount categoria 3 (8.50 - 8.99): </strong>
                    {isEditingDiscount3 ? (
                        <>
                            <input type="number" value={editableDiscount3} onChange={(e) => setEditableDiscount3(e.target.value)} disabled={isSaving.discount3} /> %{" "}
                            <button onClick={saveDiscount3} disabled={isSaving.discount3} className="save-button general-button">{isSaving.discount3 ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit('discount3', setIsEditingDiscount3, resetDiscount3)} disabled={isSaving.discount3} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.discount3} % </span>
                            <button onClick={() => setIsEditingDiscount3(true)} className="edit-button general-button">Modifica</button>
                        </>
                    )}

                </div>
            </section>

            {/* --- Images Section --- */}
            <section className="details-section">
                <h2>Imagini</h2>
                <div className="image-gallery-manage">
                    {apartment.images.map(imgUrl => (
                        <div key={imgUrl} className="existing-image-item">
                            <img src={imgUrl} alt="Apartament" />
                            <button onClick={() => deleteExistingImage(imgUrl)} disabled={isSaving.deleteImage} className="delete-button general-button">sterge</button>
                        </div>
                    ))}
                </div>
                <div className="image-upload-area">
                    <h3>Adauga Imagini Noi</h3>
                    <input type="file" multiple accept="image/*" onChange={handleImageFileChange} />
                    <div className="image-previews">
                        {imagePreviews.map((previewUrl, index) => (
                            <div key={index} className="new-image-preview">
                                <img src={previewUrl} alt={`Preview ${index}`} />
                                <button onClick={() => removeNewImagePreview(index)}>X</button>
                            </div>
                        ))}
                    </div>
                    {imageFiles.length > 0 && (
                        <button onClick={uploadImages} disabled={isUploadingImages} className="upload-button general-button">
                            {isUploadingImages ? "Se incarca..." : `incarca ${imageFiles.length} imagini`}
                        </button>
                    )}
                </div>
            </section>

            {/* --- Facilities Section --- */}
            <section className="details-section">
                <h2>Facilitati</h2>
                {isEditingFacilities ? (
                    <div className="edit-mode-form">
                        <div className="facilities-checkbox-grid">
                            {ALL_POSSIBLE_FACILITIES.map(facility => (
                                <label key={facility}>
                                    <input type="checkbox" checked={selectedFacilities.includes(facility)} onChange={() => handleFacilityToggle(facility)} />
                                    {facility}
                                </label>
                            ))}
                        </div>
                        <div className="form-actions">
                            <button onClick={saveFacilities} disabled={isSaving.Facilitati} className="save-button general-button">{isSaving.Facilitati ? "Salv..." : "Salveaza Facilitati"}</button>
                            <button onClick={() => handleCancelEdit('facilities', setIsEditingFacilities, resetFacilities)} disabled={isSaving.Facilitati} className="cancel-button general-button">Anuleaza</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {apartment.facilities && apartment.facilities.length > 0 ? (
                            <ul className="facilities-list-display">{apartment.facilities.map(f => <li key={f}>{f}</li>)}</ul>
                        ) : <p>Nicio facilitate listata.</p>}
                        <button onClick={() => setIsEditingFacilities(true)} className="edit-button general-button">Modifica Facilitati</button>
                    </>
                )}
            </section>

            {/* --- Utility Prices Section --- */}
            <section className="details-section">
                <h2>Preturi Utilitati</h2>
                {isEditingUtilityPrices ? (
                    <div className="edit-mode-form">
                        {editableUtilityPrices.map((util, index) => (
                            <div key={index} className="utility-price-item-edit">
                                <input type="text" placeholder="Nume Utilitate" value={util.name} onChange={e => handleUtilityPriceChange(index, 'name', e.target.value)} />
                                <input type="number" placeholder="Pret" value={util.price} onChange={e => handleUtilityPriceChange(index, 'price', e.target.value)} />
                                <input type="text" placeholder="Unitate (RON/mc)" value={util.unit} onChange={e => handleUtilityPriceChange(index, 'unit', e.target.value)} />
                                <label><input type="checkbox" checked={util.isIncludedInRent} onChange={e => handleUtilityPriceChange(index, 'isIncludedInRent', e.target.checked)} /> Inclus in chirie</label>
                                <button onClick={() => removeUtilityPrice(index)} className="remove-button general-button">-</button>
                            </div>
                        ))}
                        <button onClick={addUtilityPrice} className="add-button general-button">Adauga Pret Utilitate</button>
                        <div className="form-actions">
                            <button onClick={saveUtilityPrices} disabled={isSaving['Preturi Utilitati']} className="save-button general-button">{isSaving['Preturi Utilitati'] ? "Salv..." : "Salveaza Preturi Utilitati"}</button>
                            <button onClick={() => handleCancelEdit('utilityPrices', setIsEditingUtilityPrices, resetUtilityPrices)} disabled={isSaving['Preturi Utilitati']} className="cancel-button general-button">Anuleaza</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {apartment.utilityPrices && apartment.utilityPrices.length > 0 ? (
                            <ul>{apartment.utilityPrices.map((u, i) => <li key={u._id || i}>{u.name}: {u.price} {u.unit} {u.isIncludedInRent ? '(inclus)' : ''}</li>)}</ul>
                        ) : <p>Niciun pret pentru utilitati.</p>}
                        <button onClick={() => setIsEditingUtilityPrices(true)} className="edit-button general-button">Modifica Preturi Utilitati</button>
                    </>
                )}
            </section>

            {/* --- Renovation Year Section --- */}
            <section className="details-section">
                <h2>An Renovare</h2>
                <div className="editable-field">
                    {isEditingRenovationYear ? (
                        <>
                            <input type="number" placeholder="An (ex: 2020)" value={editableRenovationYear} onChange={(e) => setEditableRenovationYear(e.target.value)} disabled={isSaving['An Renovare']} />
                            <button onClick={saveRenovationYear} disabled={isSaving['An Renovare']} className="save-button general-button">{isSaving['An Renovare'] ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit('renovationYear', setIsEditingRenovationYear, resetRenovationYear)} disabled={isSaving['An Renovare']} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.renovationYear || "Nespecificat"}</span>
                            <button onClick={() => setIsEditingRenovationYear(true)} className="edit-button general-button">Modifica</button>
                        </>
                    )}
                </div>
            </section>

            {/* --- Rentals Section --- */}
            <div className="rentals-section-container">
                <section className="details-section current-rentals">
                    <h2>Chiriasi Actuali</h2>
                    {loadingRentals && <p>Se incarca...</p>}
                    {!loadingRentals && currentRentals.length > 0 ? (
                        <ul>
                            {currentRentals.map(rental => (
                                <li key={rental._id}>
                                    Chirias: {rental.tenant.name} (ID: {rental.tenant._id}) <br />
                                    Perioada: {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} <br />
                                    Status: {rental.status}
                                    {rental.status === 'active' || rental.status === 'upcoming' ? (
                                        <button onClick={() => handleCancelRental(rental._id)} disabled={isSaving.cancelRental} className="cancel-rental-button general-button">
                                            {isSaving.cancelRental ? "Anul..." : "Anuleaza Chiria"}
                                        </button>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : !loadingRentals && <p>Niciun chirias actual.</p>}
                </section>

                <section className="details-section rental-history">
                    <h2>Istoric Chirii</h2>
                    {loadingRentals && !rentalHistory && <p>Se incarca...</p>}
                    {!loadingRentals && rentalHistory && rentalHistory.rentals.length > 0 ? (
                        <>
                            <ul>
                                {rentalHistory.rentals.map(rental => {
                                    console.log("my rental:", rental);
                                    return (<li key={rental._id}>
                                        Chirias: {rental.clientData.fullName} <br />
                                        Perioada: {new Date(rental.checkIn).toLocaleDateString()} - {new Date(rental.checkOut).toLocaleDateString()} <br />
                                        Pret: {rental.finalPrice} RON <br />
                                    </li>);
                                })}
                            </ul>
                            <div className="pagination-controls">
                                <button onClick={() => fetchRentalHistory(rentalHistoryPage - 1)} disabled={rentalHistoryPage <= 1 || loadingRentals} className="general-button">Anterior</button>
                                <span>Pagina {rentalHistoryPage} din {rentalHistory.totalPages}</span>
                                <button onClick={() => fetchRentalHistory(rentalHistoryPage + 1)} disabled={rentalHistoryPage >= rentalHistory.totalPages || loadingRentals} className="general-button">Urmator</button>
                            </div>
                        </>
                    ) : !loadingRentals && <p>Niciun istoric de chirii.</p>}
                </section>
            </div>

            {/* --- Delete Apartment Section --- */}
            <section className="details-section delete-apartment-section">
                <h2>Sterge Listarea Apartamentului</h2>
                <p className="warning-text">Aceasta actiune este ireversibila si va sterge toate datele asociate cu acest apartament.</p>
                <button onClick={handleDeleteApartment} disabled={isSaving.deleteApartment} className="delete-apartment-button general-button">
                    {isSaving.deleteApartment ? "Se sterge..." : "sterge Apartamentul Definitiv"}
                </button>
            </section>
        </div >
    );
};

export default OwnerApartmentDetails;