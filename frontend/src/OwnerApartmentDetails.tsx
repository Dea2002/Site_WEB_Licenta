import React, { useState, useEffect, useContext, useCallback, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { Apartment, PaginatedRentals, Rental } from "./types";
import "./OwnerApartmentDetails.css"; // Asigura-te ca CSS-ul este actualizat

interface FacilityMap {
    key: keyof Apartment['facilities']; // 'wifi' | 'parking' | ...
    label: string;                     // "Wi-Fi", "Parcare Gratuita"
}

const ALL_POSSIBLE_FACILITIES_MAP: FacilityMap[] = [
    { key: 'parking', label: 'Parcare inclusa' },
    { key: 'videoSurveillance', label: 'Supraveghere video' },
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'airConditioning', label: 'Aer Conditionat' },
    { key: 'tvCable', label: 'TV Cablu' },
    { key: 'laundryMachine', label: 'Masina de spalat rufe' },
    { key: 'fullKitchen', label: 'Bucatarie complet utilata' },
    { key: 'fireAlarm', label: 'Alarma de incendiu' },
    { key: 'smokeDetector', label: 'Detector de fum' },
    { key: 'balcony', label: 'Balcon' },
    { key: 'terrace', label: 'Terasa' },
    { key: 'soundproofing', label: 'Izolat fonic' },
    { key: 'underfloorHeating', label: 'Incalzire in pardoseala' },
    { key: 'petFriendly', label: 'Permite animale' },
    { key: 'elevator', label: 'Lift' },
    { key: 'pool', label: 'Piscina' },
    { key: 'gym', label: 'Sala de fitness' },
    { key: 'bikeStorage', label: 'Parcare biciclete' },
    { key: 'storageRoom', label: 'Camera depozitare' },
    { key: 'rooftop', label: 'Acces acoperis' },
    { key: 'intercom', label: 'Interfon' },
];

const OwnerApartmentDetails: React.FC = () => {
    const { token } = useContext(AuthContext);
    const { apartmentId } = useParams<{ apartmentId: string }>();
    const navigate = useNavigate();

    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({}); // Pentru stari de salvare per sectiune

    // stari pentru pretul principal
    const [editableMainPrice, setEditableMainPrice] = useState<string>("");
    const [isEditingMainPrice, setIsEditingMainPrice] = useState<boolean>(false);

    // stari pentru discounturi
    const [editableDiscount1, setEditableDiscount1] = useState<string>("");
    const [editableDiscount2, setEditableDiscount2] = useState<string>("");
    const [editableDiscount3, setEditableDiscount3] = useState<string>("");
    const [isEditingDiscount1, setIsEditingDiscount1] = useState<boolean>(false);
    const [isEditingDiscount2, setIsEditingDiscount2] = useState<boolean>(false);
    const [isEditingDiscount3, setIsEditingDiscount3] = useState<boolean>(false);

    // O singura stare pentru a controla editarea intregii sectiuni de discounturi
    const [isEditingDiscounts, setIsEditingDiscounts] = useState<boolean>(false);

    // stari pentru facilitati
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
    const [isEditingFacilities, setIsEditingFacilities] = useState<boolean>(false);

    // stari pentru preturi utilitati individuale
    const [editableInternetPrice, setEditableInternetPrice] = useState<string>("");
    const [editableTVPrice, setEditableTVPrice] = useState<string>("");
    const [editableWaterPrice, setEditableWaterPrice] = useState<string>("");
    const [editableGasPrice, setEditableGasPrice] = useState<string>("");
    const [editableElectricityPrice, setEditableElectricityPrice] = useState<string>("");
    const [isEditingUtilityPrices, setIsEditingUtilityPrices] = useState<boolean>(false); // O singura stare pentru a deschide sectiunea de editare utilitati


    // stari pentru an renovare
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


    const parseNumericField = (value: any): string => {
        if (value === null || value === undefined || value === "") return "";
        const num = Number(value); // incearca sa convertesti la numar
        if (isNaN(num)) return String(value); // Daca nu e numar valid, returneaza stringul original
        return String(num); // Returneaza ca string pentru input
    };

    const parseFloatOrNull = (value: string): number | null => {
        if (value === "" || value === null || value === undefined) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num; // Returneaza null daca nu e numar valid
    };

    const parseIntOrNull = (value: string): number | null => {
        if (value === "" || value === null || value === undefined) return null;
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
    };

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
            console.log("Detalii apartament:", aptData);

            setEditableMainPrice(parseNumericField(aptData.price));
            if (aptData.discounts) {
                setEditableDiscount1(parseNumericField(aptData.discounts.discount1));
                setEditableDiscount2(parseNumericField(aptData.discounts.discount2));
                setEditableDiscount3(parseNumericField(aptData.discounts.discount3));
            } else {
                setEditableDiscount1("");
                setEditableDiscount2("");
                setEditableDiscount3("");
            }

            // Initializare facilitati bazate pe obiectul aptData.facilities
            const initialFacilitiesLabels: string[] = [];
            if (aptData.facilities) { // Verifica daca obiectul facilities exista
                ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
                    if (aptData.facilities[facilityMapItem.key] === true) {
                        initialFacilitiesLabels.push(facilityMapItem.label);
                    }
                });
            }
            setSelectedFacilities(initialFacilitiesLabels);

            if (aptData.utilities) { // Verifica daca utilities exista
                setEditableInternetPrice(parseNumericField(aptData.utilities.internetPrice));
                setEditableTVPrice(parseNumericField(aptData.utilities.TVPrice));
                setEditableWaterPrice(parseNumericField(aptData.utilities.waterPrice));
                setEditableGasPrice(parseNumericField(aptData.utilities.gasPrice));
                setEditableElectricityPrice(parseNumericField(aptData.utilities.electricityPrice));
            } else {
                // Seteaza valori default daca utilities lipseste
                setEditableInternetPrice("");
                setEditableTVPrice("");
                setEditableWaterPrice("");
                setEditableGasPrice("");
                setEditableElectricityPrice("");
            }

            setEditableRenovationYear(aptData.renovationYear?.toString() || "");
        } catch (err: any) {
            console.error("Eroare la preluarea detaliilor apartamentului:", err);
            setError(err.response?.data?.message || "Nu s-au putut incarca detaliile apartamentului.");
        } finally {
            setLoading(false);
        }
    }, [apartmentId, token]);

    // const fetchCurrentRentals = useCallback(async () => {
    //     if (!apartmentId || !token) return;
    //     setLoadingRentals(true);
    //     try {
    //         const response = await api.get<Rental[]>(`/rentals/apartment/${apartmentId}/current`, {
    //             headers: { Authorization: `Bearer ${token}` }
    //         });
    //         setCurrentRentals(response.data);
    //     } catch (err) {
    //         console.error("Eroare la preluarea chiriilor actuale:", err);
    //     } finally {
    //         setLoadingRentals(false);
    //     }
    // }, [apartmentId, token]);

    const fetchRentalHistory = useCallback(async (page: number = 1) => {
        if (!apartmentId || !token) return;
        setLoadingRentals(true);
        try {
            const response = await api.get<PaginatedRentals>(`/apartments/rentals/${apartmentId}/history?page=${page}&limit=10`, {
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
            // fetchCurrentRentals();
            fetchRentalHistory(1);
        }
    }, [apartment?._id, /* fetchCurrentRentals */, fetchRentalHistory]);


    // --- GENERIC SAVE FUNCTION ---
    const handleSaveSection = async (
        fieldsToUpdate: Partial<Apartment>, // Permite actualizarea mai multor campuri odata
        sectionKey: string,
        editModeSetter?: React.Dispatch<React.SetStateAction<boolean>> // editModeSetter devine optional
    ) => {
        if (!apartment) return;
        setIsSaving(prev => ({ ...prev, [sectionKey]: true }));
        setError(null);
        try {

            const response = await api.put<Apartment>(`/apartments/${apartment._id}`, fieldsToUpdate, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const newAptData = response.data;
            setApartment(newAptData); // Actualizeaza tot obiectul apartment

            // Resetam starile editabile pe baza datelor noi primite
            setEditableMainPrice(parseNumericField(newAptData.price));
            setEditableDiscount1(parseNumericField(newAptData.discounts.discount1));
            setEditableDiscount2(parseNumericField(newAptData.discounts.discount2));
            setEditableDiscount3(parseNumericField(newAptData.discounts.discount3));

            let updatedFacilitiesLabels: string[] = [];
            if (newAptData.facilities) {
                ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
                    if (newAptData.facilities[facilityMapItem.key] === true) {
                        updatedFacilitiesLabels.push(facilityMapItem.label);
                    }
                });
            }
            setSelectedFacilities(updatedFacilitiesLabels); // Updated selected facilities based on response
            setEditableInternetPrice(parseNumericField(newAptData.utilities.internetPrice));
            setEditableTVPrice(parseNumericField(newAptData.utilities.TVPrice));
            setEditableWaterPrice(parseNumericField(newAptData.utilities.waterPrice));
            setEditableGasPrice(parseNumericField(newAptData.utilities.gasPrice));
            setEditableElectricityPrice(parseNumericField(newAptData.utilities.electricityPrice));

            setEditableRenovationYear(parseNumericField(newAptData.renovationYear));

            if (editModeSetter) {
                editModeSetter(false);
            }
            alert(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} actualizat(a) cu succes!`);
        } catch (err: any) {
            console.error(`Eroare la actualizarea ${sectionKey}:`, err);
            setError(err.response?.data?.message || `Nu s-a putut actualiza ${sectionKey}.`);
        } finally {
            setIsSaving(prev => ({ ...prev, [sectionKey]: false }));
        }
    };


    const handleCancelEdit = (
        editModeSetter: React.Dispatch<React.SetStateAction<boolean>>,
        resetFunction: () => void
    ) => {
        resetFunction();
        editModeSetter(false);
        setError(null);
    };

    // pret principal
    const resetMainPrice = () => apartment && setEditableMainPrice(parseNumericField(apartment.price));
    const saveMainPrice = () => {
        if (editableMainPrice !== "" && (isNaN(parseFloat(editableMainPrice)) || parseFloat(editableMainPrice) < 0)) {
            setError("Pretul trebuie sa fie un numar pozitiv sau gol."); return;
        }
        handleSaveSection({ price: parseFloat(editableMainPrice) }, 'Pret principal', setIsEditingMainPrice);
    }

    // discounturi
    const resetDiscounts = () => {
        if (apartment && apartment.discounts) {
            setEditableDiscount1(parseNumericField(apartment.discounts.discount1));
            setEditableDiscount2(parseNumericField(apartment.discounts.discount2));
            setEditableDiscount3(parseNumericField(apartment.discounts.discount3));
        } else {
            setEditableDiscount1(""); setEditableDiscount2(""); setEditableDiscount3("");
        }
    };

    const saveAllDiscounts = () => {
        const d1 = parseFloatOrNull(editableDiscount1);
        const d2 = parseFloatOrNull(editableDiscount2);
        const d3 = parseFloatOrNull(editableDiscount3);

        const isValid = (d: number | null) => d === null || (d >= 0 && d <= 100);

        if (!isValid(d1) || !isValid(d2) || !isValid(d3)) {
            setError("Discounturile trebuie sa fie procentaje intre 0-100 sau goale.");
            return;
        }

        const discountsPayload: Apartment['discounts'] = {
            discount1: d1 as number, // Backend-ul ar trebui sa accepte null sau numar
            discount2: d2 as number,
            discount3: d3 as number,
        };
        handleSaveSection({ discounts: discountsPayload }, 'Discounturi', setIsEditingDiscounts);
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

    useEffect(() => { // Cleanup pentru previews la unmount
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    // --- FACILITIES ---
    const resetFacilities = () => {
        if (!apartment || !apartment.facilities) { // Verifica si apartment.facilities
            setSelectedFacilities([]); // Sau o alta valoare default
            return;
        }
        const initialFacilitiesLabels: string[] = [];
        ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
            if (apartment.facilities[facilityMapItem.key] === true) {
                initialFacilitiesLabels.push(facilityMapItem.label);
            }
        });
        setSelectedFacilities(initialFacilitiesLabels);
    }

    const handleFacilityToggle = (facility: string) => {
        setSelectedFacilities(prev =>
            prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
        );
    };

    const saveFacilities = () => {
        // Construieste obiectul `facilities` pentru payload
        const facilitiesPayload: Partial<Apartment['facilities']> = {}; // Folosim Partial pentru a nu fi obligati sa trimitem toate cheile

        ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
            // Setam cheia pe true daca eticheta corespunzatoare este in selectedFacilities (cele bifate)
            // Altfel, o setam pe false (cele nebifate)
            facilitiesPayload[facilityMapItem.key] = selectedFacilities.includes(facilityMapItem.label);
        });

        // Trimitem doar obiectul facilities
        handleSaveSection({ facilities: facilitiesPayload as Apartment['facilities'] }, 'Facilitati', setIsEditingFacilities);
    };

    // --- UTILITY PRICES ---
    const resetUtilityPrices = () => {
        if (apartment && apartment.utilities) {
            setEditableInternetPrice(parseNumericField(apartment.utilities.internetPrice));
            setEditableTVPrice(parseNumericField(apartment.utilities.TVPrice));
            setEditableWaterPrice(parseNumericField(apartment.utilities.waterPrice));
            setEditableGasPrice(parseNumericField(apartment.utilities.gasPrice));
            setEditableElectricityPrice(parseNumericField(apartment.utilities.electricityPrice));
        } else {
            setEditableInternetPrice(""); setEditableTVPrice(""); setEditableWaterPrice("");
            setEditableGasPrice(""); setEditableElectricityPrice("");
        }
    };

    const saveAllUtilityPrices = () => {
        const internetP = parseFloatOrNull(editableInternetPrice);
        const tvP = parseFloatOrNull(editableTVPrice);
        const waterP = parseFloatOrNull(editableWaterPrice);
        const gasP = parseFloatOrNull(editableGasPrice);
        const electricityP = parseFloatOrNull(editableElectricityPrice);

        // Adauga validari daca e necesar (ex: preturi pozitive)
        const utilitiesPayload: Apartment['utilities'] = {
            internetPrice: internetP as number, // Backend-ul sa accepte null sau numar
            TVPrice: tvP as number,
            waterPrice: waterP as number,
            gasPrice: gasP as number,
            electricityPrice: electricityP as number,
        };
        handleSaveSection({ utilities: utilitiesPayload }, 'Preturi Utilitati', setIsEditingUtilityPrices);
    };

    // --- RENOVATION YEAR ---
    const resetRenovationYear = () => apartment && setEditableRenovationYear(parseNumericField(apartment.renovationYear));
    const saveRenovationYear = () => {
        const yearValue = parseIntOrNull(editableRenovationYear);
        if (editableRenovationYear !== "" && (yearValue === null || yearValue < 1800 || yearValue > new Date().getFullYear() + 10)) {
            setError("Anul renovarii nu este valid."); return;
        }
        handleSaveSection({ renovationYear: yearValue as number }, 'An Renovare', setIsEditingRenovationYear);
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
            // fetchCurrentRentals(); // Reincarca lista de chirii actuale
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
                <p><strong>Locatie:</strong> {apartment.location || "N/A"}</p>
                <p><strong>Camere:</strong> {apartment.numberOfRooms || "N/A"}</p>
                <p><strong>Bai:</strong> {apartment.numberOfBathrooms || "N/A"}</p>
                <p><strong>Etaj:</strong> {apartment.floorNumber || "N/A"}</p>
                <p><strong>Suprafata:</strong> {apartment.totalSurface || "N/A"} mp</p>
                <p><strong>An constructie:</strong> {apartment.constructionYear || "N/A"}</p>
            </section>

            {/* --- Discounts Section --- */}
            <section className="details-section">
                <h2>Preturi si discounturi</h2>
                <div className="editable-field">
                    <strong>Pret principal: </strong>
                    {isEditingMainPrice ? (
                        <>
                            <input type="number" value={editableMainPrice} onChange={(e) => setEditableMainPrice(e.target.value)} disabled={isSaving['Pret principal']} /> RON/camera/noapte
                            <button onClick={saveMainPrice} disabled={isSaving['Pret principal']} className="save-button general-button">{isSaving['Pret principal'] ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit(setIsEditingMainPrice, resetMainPrice)} disabled={isSaving['Pret principal']} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.price} RON/camera/noapte </span>
                            <button onClick={() => setIsEditingMainPrice(true)} className="edit-button general-button">Modifica Pretul</button>
                        </>
                    )}
                </div>
                <hr className="line-divider short" />

                {isEditingDiscounts ? (
                    <div className="edit-mode-form">
                        <div className="editable-field">
                            <label htmlFor="discount1"><strong>Discount categoria 1 (9.50 - 10.00)</strong>:</label>
                            <input id="discount1" type="number" value={editableDiscount1} onChange={(e) => setEditableDiscount1(e.target.value)} disabled={isSaving.Discounturi} />
                            <label>%</label>
                        </div>
                        <div className="editable-field">
                            <label htmlFor="discount2"><strong>Discount categoria 2 (9.00 - 9.49)</strong>:</label>
                            <input id="discount2" type="number" value={editableDiscount2} onChange={(e) => setEditableDiscount2(e.target.value)} disabled={isSaving.Discounturi} />
                            <label>%</label>
                        </div>
                        <div className="editable-field">
                            <label htmlFor="discount3"><strong>Discount categoria 3 (8.50 - 8.99)</strong>:</label>
                            <input id="discount3" type="number" value={editableDiscount3} onChange={(e) => setEditableDiscount3(e.target.value)} disabled={isSaving.Discounturi} />
                            <label>%</label>
                        </div>
                        <div className="form-actions">
                            <button onClick={saveAllDiscounts} disabled={isSaving.Discounturi} className="save-button general-button">{isSaving.Discounturi ? "Salv..." : "Salveaza Discounturi"}</button>
                            <button onClick={() => handleCancelEdit(setIsEditingDiscounts, resetDiscounts)} disabled={isSaving.Discounturi} className="cancel-button general-button">Anuleaza</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p><strong>Discount categoria 1 (9.50 - 10.00): </strong>{apartment.discounts?.discount1 ?? "N/A"} %</p>
                        <p><strong>Discount categoria 2 (9.00 - 9.49): </strong>{apartment.discounts?.discount2 ?? "N/A"} %</p>
                        <p><strong>Discount categoria 3 (8.50 - 8.99): </strong>{apartment.discounts?.discount3 ?? "N/A"} %</p>
                        <button onClick={() => setIsEditingDiscounts(true)} className="edit-button general-button">Modifica Discounturi</button>
                    </div>
                )}


            </section >

            {/* --- Images Section --- */}
            < section className="details-section" >
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
            </section >

            {/* --- Facilities Section --- */}
            < section className="details-section" >
                <h2>Facilitati</h2>
                {
                    isEditingFacilities ? (
                        <div className="edit-mode-form">
                            <div className="facilities-checkbox-grid">
                                {ALL_POSSIBLE_FACILITIES_MAP.map(facilityMapItem => ( // Iteram peste MAP
                                    <label key={facilityMapItem.key} className="facility-checkbox-label">
                                        <input
                                            type="checkbox"
                                            // Verificam daca `label`-ul este in `selectedFacilities`
                                            checked={selectedFacilities.includes(facilityMapItem.label)}
                                            // La schimbare, folosim `label`-ul
                                            onChange={() => handleFacilityToggle(facilityMapItem.label)}
                                            disabled={isSaving.Facilitati}
                                        />
                                        {facilityMapItem.label} {/* Afisam `label`-ul */}
                                    </label>
                                ))}
                            </div>
                            <div className="form-actions">
                                <button onClick={saveFacilities} disabled={isSaving.Facilitati} className="save-button general-button">{isSaving.Facilitati ? "Salv..." : "Salveaza Facilitati"}</button>
                                <button onClick={() => handleCancelEdit(setIsEditingFacilities, resetFacilities)} disabled={isSaving.Facilitati} className="cancel-button general-button">Anuleaza</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Afisam facilitatile active (cele din selectedFacilities) */}
                            {selectedFacilities.length > 0 ? (
                                <ul className="facilities-list-display">{selectedFacilities.map(label => <li key={label}>{label}</li>)}</ul>
                            ) : <p>Nicio facilitate selectata.</p>}
                            <button onClick={() => setIsEditingFacilities(true)} className="edit-button general-button">Modifica Facilitati</button>
                        </>
                    )
                }
            </section >

            {/* --- Utility Prices Section --- */}
            <section className="details-section">
                <h2>Preturi Utilitati (RON/luna sau per unitate)</h2>
                {isEditingUtilityPrices ? (
                    <div className="edit-mode-form">
                        <div className="utility-price-item-edit">
                            <label htmlFor="internetPriceEdit">Internet:</label>
                            <input id="internetPriceEdit" type="number" placeholder="Pret Internet" value={editableInternetPrice} onChange={e => setEditableInternetPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="tvPriceEdit">TV:</label>
                            <input id="tvPriceEdit" type="number" placeholder="Pret TV" value={editableTVPrice} onChange={e => setEditableTVPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="waterPriceEdit">Apa:</label>
                            <input id="waterPriceEdit" type="number" placeholder="Pret Apa" value={editableWaterPrice} onChange={e => setEditableWaterPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="gasPriceEdit">Gaz:</label>
                            <input id="gasPriceEdit" type="number" placeholder="Pret Gaz" value={editableGasPrice} onChange={e => setEditableGasPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="electricityPriceEdit">Electricitate:</label>
                            <input id="electricityPriceEdit" type="number" placeholder="Pret Electricitate" value={editableElectricityPrice} onChange={e => setEditableElectricityPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="form-actions">
                            <button onClick={saveAllUtilityPrices} disabled={isSaving['Preturi Utilitati']} className="save-button general-button">{isSaving['Preturi Utilitati'] ? "Salv..." : "Salveaza Preturi Utilitati"}</button>
                            <button onClick={() => handleCancelEdit(setIsEditingUtilityPrices, resetUtilityPrices)} disabled={isSaving['Preturi Utilitati']} className="cancel-button general-button">Anuleaza</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p>Internet: {apartment.utilities?.internetPrice ?? "N/A"} RON</p>
                        <p>TV: {apartment.utilities?.TVPrice ?? "N/A"} RON</p>
                        <p>Apa: {apartment.utilities?.waterPrice ?? "N/A"} RON</p>
                        <p>Gaz: {apartment.utilities?.gasPrice ?? "N/A"} RON</p>
                        <p>Electricitate: {apartment.utilities?.electricityPrice ?? "N/A"} RON</p>
                        <button onClick={() => setIsEditingUtilityPrices(true)} className="edit-button general-button">Modifica Preturi Utilitati</button>
                    </>
                )}
            </section>

            {/* --- Renovation Year Section --- */}
            < section className="details-section" >
                <h2>An Renovare</h2>
                <div className="editable-field">
                    {isEditingRenovationYear ? (
                        <>
                            <input type="number" placeholder="An (ex: 2020)" value={editableRenovationYear} onChange={(e) => setEditableRenovationYear(e.target.value)} disabled={isSaving['An Renovare']} />
                            <button onClick={saveRenovationYear} disabled={isSaving['An Renovare']} className="save-button general-button">{isSaving['An Renovare'] ? "Salv..." : "Salveaza"}</button>
                            <button onClick={() => handleCancelEdit(setIsEditingRenovationYear, resetRenovationYear)} disabled={isSaving['An Renovare']} className="cancel-button general-button">Anuleaza</button>
                        </>
                    ) : (
                        <>
                            <span>{apartment.renovationYear || "Nespecificat"}{" "}</span>
                            <button onClick={() => setIsEditingRenovationYear(true)} className="edit-button general-button">Modifica Anul</button>
                        </>
                    )}
                </div>
            </section >

            {/* --- Rentals Section --- */}
            < div className="rentals-section-container" >
                <section className="details-section current-rentals">
                    <h2>Chiriasi Actuali & Urmatori</h2>
                    {loadingRentals && <p>Se incarca...</p>}
                    {!loadingRentals && currentRentals.length > 0 ? (
                        <ul>
                            {currentRentals.map(rental => (
                                <li key={rental._id}>
                                    Chirias: {rental.tenant?.name || rental.clientData?.fullName || "N/A"} <br />
                                    Perioada: {new Date(rental.checkIn || rental.checkIn).toLocaleDateString()} - {new Date(rental.checkOut || rental.checkOut).toLocaleDateString()} <br />
                                    Status: {rental.status}
                                    {(rental.status === 'active' || rental.status === 'upcoming' || rental.status === 'pending_approval') && (
                                        <button onClick={() => handleCancelRental(rental._id)} disabled={isSaving.cancelRental} className="cancel-rental-button general-button">
                                            {isSaving.cancelRental ? "Anul..." : "Anuleaza Chiria"}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : !loadingRentals && <p>Niciun chirias actual sau programat.</p>}
                </section>

                <section className="details-section rental-history">
                    <h2>Istoric Chirii</h2>
                    {loadingRentals && !rentalHistory && <p>Se incarca...</p>}
                    {!loadingRentals && rentalHistory && rentalHistory.rentals.length > 0 ? (
                        <>
                            <ul>
                                {rentalHistory.rentals.map(rental => (
                                    <li key={rental._id}>
                                        Chirias: {rental.clientData?.fullName || rental.tenant?.name || "N/A"} <br />
                                        Perioada: {new Date(rental.checkIn || rental.checkIn).toLocaleDateString()} - {new Date(rental.checkOut || rental.checkOut).toLocaleDateString()} <br />
                                        Pret final: {rental.finalPrice} RON <br />
                                        Status: {rental.status}
                                    </li>
                                ))}
                            </ul>
                            {rentalHistory.totalPages > 1 && (
                                <div className="pagination-controls">
                                    <button onClick={() => fetchRentalHistory(rentalHistoryPage - 1)} disabled={rentalHistoryPage <= 1 || loadingRentals} className="general-button">Anterior</button>
                                    <span>Pagina {rentalHistoryPage} din {rentalHistory.totalPages}</span>
                                    <button onClick={() => fetchRentalHistory(rentalHistoryPage + 1)} disabled={rentalHistoryPage >= rentalHistory.totalPages || loadingRentals} className="general-button">Urmator</button>
                                </div>
                            )}
                        </>
                    ) : !loadingRentals && <p>Niciun istoric de chirii.</p>}
                </section>
            </div >

            {/* --- Delete Apartment Section --- */}
            < section className="details-section delete-apartment-section" >
                <h2>Sterge Listarea Apartamentului</h2>
                <p className="warning-text">Aceasta actiune este ireversibila si va sterge toate datele asociate cu acest apartament.</p>
                <button onClick={handleDeleteApartment} disabled={isSaving.deleteApartment} className="delete-apartment-button general-button">
                    {isSaving.deleteApartment ? "Se sterge..." : "sterge Apartamentul Definitiv"}
                </button>
            </section >
        </div >
    );
};

export default OwnerApartmentDetails;