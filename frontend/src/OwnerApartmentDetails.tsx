import React, { useState, useEffect, useContext, useCallback, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment, Discount, UtilityPrice, Rental, PaginatedRentals } from "./types";
import "./OwnerApartmentDetails.css"; // Asigură-te că CSS-ul este actualizat

// O listă predefinită de facilități posibile
const ALL_POSSIBLE_FACILITIES = [
    "Wi-Fi", "Parcare Gratuită", "Aer Condiționat", "TV Cablu",
    "Mașină de spălat rufe", "Bucătărie complet utilată", "Balcon/Terasă",
    "Permite animale", "Zonă de lucru dedicată", "Piscină", "Sală de fitness"
];


const OwnerApartmentDetails: React.FC = () => {
    const { token } = useContext(AuthContext);
    const { apartmentId } = useParams<{ apartmentId: string }>();
    const navigate = useNavigate();

    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({}); // Pentru stări de salvare per secțiune

    // Stări pentru editare
    const [editablePrice, setEditablePrice] = useState<string>("");
    const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);

    const [editableDiscounts, setEditableDiscounts] = useState<Discount[]>([]);
    const [isEditingDiscounts, setIsEditingDiscounts] = useState<boolean>(false);

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

    // Chiriași
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
            setEditablePrice(aptData.price.toString());
            setEditableDiscounts(aptData.discounts ? JSON.parse(JSON.stringify(aptData.discounts)) : []); // Deep copy
            setSelectedFacilities(aptData.facilities ? [...aptData.facilities] : []);
            setEditableUtilityPrices(aptData.utilityPrices ? JSON.parse(JSON.stringify(aptData.utilityPrices)) : []); // Deep copy
            setEditableRenovationYear(aptData.renovationYear?.toString() || "");
        } catch (err: any) {
            console.error("Eroare la preluarea detaliilor apartamentului:", err);
            setError(err.response?.data?.message || "Nu s-au putut încărca detaliile apartamentului.");
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
            const response = await api.get<PaginatedRentals>(`/rentals/apartment/${apartmentId}/history?page=${page}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
            setApartment(response.data); // Actualizează tot obiectul apartment
            // Actualizează și stările locale de editare dacă e necesar pentru consistență vizuală imediată
            if (fieldName === 'price') setEditablePrice(response.data.price.toString());
            if (fieldName === 'discounts') setEditableDiscounts(response.data.discounts ? JSON.parse(JSON.stringify(response.data.discounts)) : []);
            if (fieldName === 'facilities') setSelectedFacilities(response.data.facilities ? [...response.data.facilities] : []);
            if (fieldName === 'utilityPrices') setEditableUtilityPrices(response.data.utilityPrices ? JSON.parse(JSON.stringify(response.data.utilityPrices)) : []);
            if (fieldName === 'renovationYear') setEditableRenovationYear(response.data.renovationYear?.toString() || "");

            editModeSetter(false); // Ieși din modul de editare pentru secțiunea respectivă
            alert(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} actualizat(ă) cu succes!`);
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
        resetFunction(); // Resetează datele editabile la cele originale din `apartment`
        editModeSetter(false);
        setError(null);
    };

    // --- PRICE ---
    const resetPrice = () => apartment && setEditablePrice(apartment.price.toString());
    const savePrice = () => {
        if (isNaN(parseFloat(editablePrice)) || parseFloat(editablePrice) < 0) {
            setError("Prețul trebuie să fie un număr pozitiv.");
            return;
        }
        handleSaveSection('price', parseFloat(editablePrice), 'Preț', setIsEditingPrice);
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
        // Adaugă validare pentru discounturi (date, procente)
        if (editableDiscounts.some(d => !d.startDate || !d.endDate || d.percentage <= 0 || d.percentage > 100)) {
            setError("Toate discounturile trebuie să aibă date valide și un procentaj între 1 și 100.");
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
        imageFiles.forEach(file => formData.append('images', file)); // 'images' trebuie să fie numele așteptat de backend

        try {
            const response = await api.post<Apartment>(`/apartments/${apartment._id}/images`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setApartment(response.data); // Backend-ul ar trebui să returneze apartamentul actualizat cu noile URL-uri
            setImageFiles([]);
            imagePreviews.forEach(url => URL.revokeObjectURL(url)); // Clean up
            setImagePreviews([]);
            alert("Imaginile au fost încărcate cu succes!");
        } catch (err: any) {
            console.error("Eroare la încărcarea imaginilor:", err);
            setError(err.response?.data?.message || "Eroare la încărcarea imaginilor.");
        } finally {
            setIsUploadingImages(false);
        }
    };
    const deleteExistingImage = async (imageUrl: string) => {
        if (!apartment || !window.confirm("Sigur doriți să ștergeți această imagine?")) return;
        setIsSaving(prev => ({ ...prev, deleteImage: true }));
        try {
            // Presupunem un endpoint care primește URL-ul imaginii de șters
            // sau trimitem întreaga listă de imagini actualizată la endpoint-ul PUT general
            const updatedImages = apartment.images.filter(img => img !== imageUrl);
            const response = await api.put<Apartment>(`/apartments/${apartment._id}`, { images: updatedImages }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApartment(response.data);
            alert("Imagine ștearsă cu succes!");
        } catch (err: any) {
            console.error("Eroare la ștergerea imaginii:", err);
            setError(err.response?.data?.message || "Eroare la ștergerea imaginii.");
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
    const saveFacilities = () => handleSaveSection('facilities', selectedFacilities, 'Facilități', setIsEditingFacilities);

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
        // Adaugă validare
        if (editableUtilityPrices.some(up => !up.name || !up.unit || up.price < 0)) {
            setError("Toate utilitățile trebuie să aibă nume, unitate și preț pozitiv.");
            return;
        }
        handleSaveSection('utilityPrices', editableUtilityPrices, 'Prețuri Utilități', setIsEditingUtilityPrices);
    }

    // --- RENOVATION YEAR ---
    const resetRenovationYear = () => apartment && setEditableRenovationYear(apartment.renovationYear?.toString() || "");
    const saveRenovationYear = () => {
        const year = parseInt(editableRenovationYear);
        if (editableRenovationYear && (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 5)) {
            setError("Anul renovării nu este valid.");
            return;
        }
        handleSaveSection('renovationYear', editableRenovationYear ? year : null, 'An Renovare', setIsEditingRenovationYear);
    }

    // --- RENTALS ACTIONS ---
    const handleCancelRental = async (rentalId: string) => {
        if (!window.confirm("Sunteți sigur că doriți să anulați această chirie?")) return;
        setIsSaving(prev => ({ ...prev, cancelRental: true }));
        try {
            // Presupunem un endpoint PATCH pentru anulare
            await api.patch(`/rentals/${rentalId}/cancel-by-owner`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Chiria a fost anulată.");
            fetchCurrentRentals(); // Reîncarcă lista de chirii actuale
            fetchRentalHistory(rentalHistoryPage); // Reîncarcă și istoricul
        } catch (err: any) {
            console.error("Eroare la anularea chiriei:", err);
            setError(err.response?.data?.message || "Nu s-a putut anula chiria.");
        } finally {
            setIsSaving(prev => ({ ...prev, cancelRental: false }));
        }
    };

    // --- DELETE APARTMENT ---
    const handleDeleteApartment = async () => {
        if (!apartment || !window.confirm("ATENȚIE! Sigur doriți să ștergeți definitiv acest apartament și toate datele asociate (chirii, etc.)? Această acțiune este ireversibilă!")) return;
        setIsSaving(prev => ({ ...prev, deleteApartment: true }));
        try {
            await api.delete(`/apartments/${apartment._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Apartamentul a fost șters cu succes.");
            navigate("/owner/apartments");
        } catch (err: any) {
            console.error("Eroare la ștergerea apartamentului:", err);
            setError(err.response?.data?.message || "Nu s-a putut șterge apartamentul.");
        } finally {
            setIsSaving(prev => ({ ...prev, deleteApartment: false }));
        }
    };


    // --- RENDER LOGIC ---
    if (loading && !apartment) return <div className="owner-apartment-details-container"><p>Se încarcă detaliile...</p></div>;
    if (!apartment) return <div className="owner-apartment-details-container"><p className="error-message">{error || "Apartamentul nu a fost găsit."}</p></div>;

    return (
        <div className="owner-apartment-details-container">
            <button onClick={() => navigate("/owner/apartments")} className="back-button general-button">
                ← Înapoi la listă
            </button>
            <h1>Editare Apartament: {apartment.location}</h1>
            {error && <p className="error-message global-error-details">{error}</p>}

            {/* --- General Info (Non-editable here, except price) --- */}
            <section className="details-section">
                <h2>Informații Generale</h2>
                <p><strong>Locație:</strong> {apartment.location}</p>
                <p><strong>Descriere:</strong> {apartment.description || "N/A"}</p>
                <p><strong>Camere:</strong> {apartment.numberOfRooms || "N/A"}, <strong>Băi:</strong> {apartment.numberOfBathrooms || "N/A"}, <strong>Suprafață:</strong> {apartment.totalSurface || "N/A"} mp</p>

                {/* Price Editing */}
                <div className="editable-field">
                    <strong>Preț principal: </strong>
                    {isEditingPrice ? (
                        <>
                            <input type="number" value={editablePrice} onChange={(e) => setEditablePrice(e.target.value)} disabled={isSaving.Preț} /> RON/noapte
                            <button onClick={savePrice} disabled={isSaving.Preț} className="save-button general-button">{isSaving.Preț ? "Salv..." : "Salvează"}</button>
                            <button onClick={() => handleCancelEdit('price', setIsEditingPrice, resetPrice)} disabled={isSaving.Preț} className="cancel-button general-button">Anulează</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.price} RON/noapte</span>
                            <button onClick={() => setIsEditingPrice(true)} className="edit-button general-button">Modifică</button>
                        </>
                    )}
                </div>
            </section>

            {/* --- Discounts Section --- */}
            <section className="details-section">
                <h2>Discounturi</h2>
                {isEditingDiscounts ? (
                    <div className="edit-mode-form">
                        {editableDiscounts.map((discount, index) => (
                            <div key={index} className="discount-item-edit">
                                <input type="number" placeholder="Procent %" value={discount.percentage} onChange={e => handleDiscountChange(index, 'percentage', e.target.value)} />
                                <input type="date" placeholder="Data Start" value={discount.startDate} onChange={e => handleDiscountChange(index, 'startDate', e.target.value)} />
                                <input type="date" placeholder="Data Sfârșit" value={discount.endDate} onChange={e => handleDiscountChange(index, 'endDate', e.target.value)} />
                                <input type="text" placeholder="Descriere (opțional)" value={discount.description || ''} onChange={e => handleDiscountChange(index, 'description', e.target.value)} />
                                <button onClick={() => removeDiscount(index)} className="remove-button general-button">-</button>
                            </div>
                        ))}
                        <button onClick={addDiscount} className="add-button general-button">Adaugă Discount</button>
                        <div className="form-actions">
                            <button onClick={saveDiscounts} disabled={isSaving.Discounturi} className="save-button general-button">{isSaving.Discounturi ? "Salv..." : "Salvează Discounturi"}</button>
                            <button onClick={() => handleCancelEdit('discounts', setIsEditingDiscounts, resetDiscounts)} disabled={isSaving.Discounturi} className="cancel-button general-button">Anulează</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {apartment.discounts && apartment.discounts.length > 0 ? (
                            <ul>{apartment.discounts.map((d, i) => <li key={d._id || i}>{d.percentage}% între {d.startDate} - {d.endDate} ({d.description || 'Fără descriere'})</li>)}</ul>
                        ) : <p>Niciun discount configurat.</p>}
                        <button onClick={() => setIsEditingDiscounts(true)} className="edit-button general-button">Modifică Discounturi</button>
                    </>
                )}
            </section>

            {/* --- Images Section --- */}
            <section className="details-section">
                <h2>Imagini</h2>
                <div className="image-gallery-manage">
                    {apartment.images.map(imgUrl => (
                        <div key={imgUrl} className="existing-image-item">
                            <img src={imgUrl} alt="Apartament" />
                            <button onClick={() => deleteExistingImage(imgUrl)} disabled={isSaving.deleteImage} className="delete-button general-button">Șterge</button>
                        </div>
                    ))}
                </div>
                <div className="image-upload-area">
                    <h3>Adaugă Imagini Noi</h3>
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
                            {isUploadingImages ? "Se încarcă..." : `Încarcă ${imageFiles.length} imagini`}
                        </button>
                    )}
                </div>
            </section>

            {/* --- Facilities Section --- */}
            <section className="details-section">
                <h2>Facilități</h2>
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
                            <button onClick={saveFacilities} disabled={isSaving.Facilități} className="save-button general-button">{isSaving.Facilități ? "Salv..." : "Salvează Facilități"}</button>
                            <button onClick={() => handleCancelEdit('facilities', setIsEditingFacilities, resetFacilities)} disabled={isSaving.Facilități} className="cancel-button general-button">Anulează</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {apartment.facilities && apartment.facilities.length > 0 ? (
                            <ul className="facilities-list-display">{apartment.facilities.map(f => <li key={f}>{f}</li>)}</ul>
                        ) : <p>Nicio facilitate listată.</p>}
                        <button onClick={() => setIsEditingFacilities(true)} className="edit-button general-button">Modifică Facilități</button>
                    </>
                )}
            </section>

            {/* --- Utility Prices Section --- */}
            <section className="details-section">
                <h2>Prețuri Utilități</h2>
                {isEditingUtilityPrices ? (
                    <div className="edit-mode-form">
                        {editableUtilityPrices.map((util, index) => (
                            <div key={index} className="utility-price-item-edit">
                                <input type="text" placeholder="Nume Utilitate" value={util.name} onChange={e => handleUtilityPriceChange(index, 'name', e.target.value)} />
                                <input type="number" placeholder="Preț" value={util.price} onChange={e => handleUtilityPriceChange(index, 'price', e.target.value)} />
                                <input type="text" placeholder="Unitate (RON/mc)" value={util.unit} onChange={e => handleUtilityPriceChange(index, 'unit', e.target.value)} />
                                <label><input type="checkbox" checked={util.isIncludedInRent} onChange={e => handleUtilityPriceChange(index, 'isIncludedInRent', e.target.checked)} /> Inclus în chirie</label>
                                <button onClick={() => removeUtilityPrice(index)} className="remove-button general-button">-</button>
                            </div>
                        ))}
                        <button onClick={addUtilityPrice} className="add-button general-button">Adaugă Preț Utilitate</button>
                        <div className="form-actions">
                            <button onClick={saveUtilityPrices} disabled={isSaving['Prețuri Utilități']} className="save-button general-button">{isSaving['Prețuri Utilități'] ? "Salv..." : "Salvează Prețuri Utilități"}</button>
                            <button onClick={() => handleCancelEdit('utilityPrices', setIsEditingUtilityPrices, resetUtilityPrices)} disabled={isSaving['Prețuri Utilități']} className="cancel-button general-button">Anulează</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {apartment.utilityPrices && apartment.utilityPrices.length > 0 ? (
                            <ul>{apartment.utilityPrices.map((u, i) => <li key={u._id || i}>{u.name}: {u.price} {u.unit} {u.isIncludedInRent ? '(inclus)' : ''}</li>)}</ul>
                        ) : <p>Niciun preț pentru utilități.</p>}
                        <button onClick={() => setIsEditingUtilityPrices(true)} className="edit-button general-button">Modifică Prețuri Utilități</button>
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
                            <button onClick={saveRenovationYear} disabled={isSaving['An Renovare']} className="save-button general-button">{isSaving['An Renovare'] ? "Salv..." : "Salvează"}</button>
                            <button onClick={() => handleCancelEdit('renovationYear', setIsEditingRenovationYear, resetRenovationYear)} disabled={isSaving['An Renovare']} className="cancel-button general-button">Anulează</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.renovationYear || "Nespecificat"}</span>
                            <button onClick={() => setIsEditingRenovationYear(true)} className="edit-button general-button">Modifică</button>
                        </>
                    )}
                </div>
            </section>

            {/* --- Rentals Section --- */}
            <div className="rentals-section-container">
                <section className="details-section current-rentals">
                    <h2>Chiriași Actuali</h2>
                    {loadingRentals && <p>Se încarcă...</p>}
                    {!loadingRentals && currentRentals.length > 0 ? (
                        <ul>
                            {currentRentals.map(rental => (
                                <li key={rental._id}>
                                    Chiriaș: {rental.tenant.name} (ID: {rental.tenant._id}) <br />
                                    Perioada: {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} <br />
                                    Status: {rental.status}
                                    {rental.status === 'active' || rental.status === 'upcoming' ? (
                                        <button onClick={() => handleCancelRental(rental._id)} disabled={isSaving.cancelRental} className="cancel-rental-button general-button">
                                            {isSaving.cancelRental ? "Anul..." : "Anulează Chiria"}
                                        </button>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : !loadingRentals && <p>Niciun chiriaș actual.</p>}
                </section>

                <section className="details-section rental-history">
                    <h2>Istoric Chirii</h2>
                    {loadingRentals && !rentalHistory && <p>Se încarcă...</p>}
                    {!loadingRentals && rentalHistory && rentalHistory.rentals.length > 0 ? (
                        <>
                            <ul>
                                {rentalHistory.rentals.map(rental => (
                                    <li key={rental._id}>
                                        Chiriaș: {rental.tenant.name} (ID: {rental.tenant._id}) <br />
                                        Perioada: {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} <br />
                                        Status: {rental.status}
                                    </li>
                                ))}
                            </ul>
                            <div className="pagination-controls">
                                <button onClick={() => fetchRentalHistory(rentalHistoryPage - 1)} disabled={rentalHistoryPage <= 1 || loadingRentals} className="general-button">Anterior</button>
                                <span>Pagina {rentalHistoryPage} din {rentalHistory.totalPages}</span>
                                <button onClick={() => fetchRentalHistory(rentalHistoryPage + 1)} disabled={rentalHistoryPage >= rentalHistory.totalPages || loadingRentals} className="general-button">Următor</button>
                            </div>
                        </>
                    ) : !loadingRentals && <p>Niciun istoric de chirii.</p>}
                </section>
            </div>

            {/* --- Delete Apartment Section --- */}
            <section className="details-section delete-apartment-section">
                <h2>Șterge Listarea Apartamentului</h2>
                <p className="warning-text">Această acțiune este ireversibilă și va șterge toate datele asociate cu acest apartament.</p>
                <button onClick={handleDeleteApartment} disabled={isSaving.deleteApartment} className="delete-apartment-button general-button">
                    {isSaving.deleteApartment ? "Se șterge..." : "Șterge Apartamentul Definitiv"}
                </button>
            </section>
        </div>
    );
};

export default OwnerApartmentDetails;