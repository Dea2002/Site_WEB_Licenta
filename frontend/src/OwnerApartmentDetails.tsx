import React, { useState, useEffect, useContext, useCallback, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { ref, deleteObject, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseConfig";
import { Apartment, PaginatedRentals, Rental, ALL_POSSIBLE_FACILITIES_MAP, Review, PaginatedResponse } from "./types";
import "./OwnerApartmentDetails.css";
import ReviewList from "./reviews/ReviewList";
import { useInitiatePrivateChat } from "./hooks/useInitiateChat";

const OwnerApartmentDetails: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const { apartmentId } = useParams<{ apartmentId: string }>();
    const navigate = useNavigate();

    const { isLoadingPrivate, initiatePrivateChat } = useInitiatePrivateChat();

    const [apartment, setApartment] = useState<Apartment | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

    // stari pentru pretul principal
    const [editableMainPrice, setEditableMainPrice] = useState<string>("");
    const [isEditingMainPrice, setIsEditingMainPrice] = useState<boolean>(false);

    // stari pentru discounturi
    const [editableDiscount1, setEditableDiscount1] = useState<string>("");
    const [editableDiscount2, setEditableDiscount2] = useState<string>("");
    const [editableDiscount3, setEditableDiscount3] = useState<string>("");

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
    const [isEditingUtilityPrices, setIsEditingUtilityPrices] = useState<boolean>(false);


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

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const parseNumericField = (value: any): string => {
        if (value === null || value === undefined || value === "") return "";
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return String(num);
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

            const initialFacilitiesLabels: string[] = [];
            if (aptData.facilities) { // Verifica daca obiectul facilities exista
                ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
                    if (aptData.facilities[facilityMapItem.key] === true) {
                        initialFacilitiesLabels.push(facilityMapItem.label);
                    }
                });
            }
            setSelectedFacilities(initialFacilitiesLabels);

            if (aptData.utilities) {
                setEditableInternetPrice(parseNumericField(aptData.utilities.internetPrice));
                setEditableTVPrice(parseNumericField(aptData.utilities.TVPrice));
                setEditableWaterPrice(parseNumericField(aptData.utilities.waterPrice));
                setEditableGasPrice(parseNumericField(aptData.utilities.gasPrice));
                setEditableElectricityPrice(parseNumericField(aptData.utilities.electricityPrice));
            } else {

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

    const fetchCurrentRentals = useCallback(async () => {
        if (!apartmentId || !token) return;
        setLoadingRentals(true);
        try {
            const response = await api.get<Rental[]>(`/apartments/rentals/${apartmentId}/current-and-upcoming`, {
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

            setRentalHistory(response.data);
            setRentalHistoryPage(response.data.currentPage);
        } catch (err) {
            console.error("Eroare la preluarea istoricului chiriilor:", err);
        } finally {
            setLoadingRentals(false);
        }
    }, [apartmentId, token]);

    const fetchConversationId = useCallback(async (currentApartmentId: string) => {
        if (!currentApartmentId || !token) return;

        try {
            const response = await api.post(
                `/conversations/apartment/${currentApartmentId}?includeOwner=true`,
            );

            setConversationId(response.data._id);

        } catch (err: any) {
            console.error("Eroare la preluarea ID-ului conversatiei:", err);
            if (err.response && err.response.status === 404) {
                setConversationId(null);
            } else {
                console.error(err.response?.data?.message || "Nu s-a putut incarca ID-ul conversatiei.");
            }
        }
    }, [token]);

    const fetchReviews = useCallback(async () => {
        if (!apartmentId) return;
        setLoadingReviews(true);
        setReviewError(null);
        try {
            const response = await api.get<PaginatedResponse<Review>>(`/reviews/apartment/${apartmentId}?sort=createdAt_desc&limit=1000`, {
            });
            if (response.data && Array.isArray(response.data.reviews)) {
                setReviews(response.data.reviews);
            } else if (Array.isArray(response.data)) {
                setReviews(response.data as any);
            }
            else {
                console.warn("Format neasteptat pentru review-uri de la API in OwnerApartmentDetails:", response.data);
                setReviews([]);
            }
        } catch (err: any) {
            console.error("Eroare la preluarea review-urilor in OwnerApartmentDetails:", err);
            setReviewError(err.response?.data?.message || "Nu s-au putut incarca recenziile.");
            setReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    }, [apartmentId, token]);

    useEffect(() => {
        fetchApartmentData();
    }, [fetchApartmentData]);

    useEffect(() => {
        if (apartment?._id) {
            fetchCurrentRentals();
            fetchRentalHistory(1);
            fetchConversationId(apartment._id);
            fetchReviews();
        }
    }, [apartment?._id, fetchCurrentRentals, fetchRentalHistory, fetchConversationId]);

    const handleReviewDeleted = (deletedReviewId: string) => {
        setReviews(prevReviews => prevReviews.filter(review => review._id !== deletedReviewId));
        fetchApartmentData();
    };

    const handleSaveSection = async (
        fieldsToUpdate: Partial<Apartment>,
        sectionKey: string,
        editModeSetter?: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        if (!apartment) return;
        setIsSaving(prev => ({ ...prev, [sectionKey]: true }));
        setError(null);
        try {

            const response = await api.put<Apartment>(`/apartments/${apartment._id}`, fieldsToUpdate, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const newAptData = response.data;
            setApartment(newAptData);

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
            setSelectedFacilities(updatedFacilitiesLabels);
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
            discount1: d1 as number,
            discount2: d2 as number,
            discount3: d3 as number,
        };
        handleSaveSection({ discounts: discountsPayload }, 'Discounturi', setIsEditingDiscounts);
    }

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
            newPreviews.forEach(url => { if (imagePreviews.includes(url)) URL.revokeObjectURL(url) });
            return newPreviews;
        });
    };

    const uploadSingleFileToFirebase = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const filePath = `apartments/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                () => { },
                (error) => {
                    console.error("Eroare Firebase la upload fisier:", error);
                    switch (error.code) {
                        case 'storage/unauthorized':
                            reject(new Error("Utilizatorul nu are permisiunea de a accesa obiectul. Verificati regulile de securitate Firebase Storage."));
                            break;
                        case 'storage/canceled':
                            reject(new Error("Upload-ul a fost anulat de utilizator."));
                            break;
                        case 'storage/unknown':
                        default:
                            reject(new Error("Eroare necunoscuta la upload-ul fisierului in Firebase Storage."));
                            break;
                    }
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    } catch (getUrlError) {
                        console.error("Eroare la obtinerea URL-ului de descarcare:", getUrlError);
                        reject(getUrlError);
                    }
                }
            );
        });
    };


    const uploadImages = async () => {
        if (imageFiles.length === 0 || !apartment) {
            if (imageFiles.length === 0) alert("Va rugam selectati cel putin o imagine.");
            return;
        }

        setIsUploadingImages(true);
        setError(null);
        let newImageUrls: string[] = [];

        try {
            const uploadPromises = imageFiles.map(file => uploadSingleFileToFirebase(file));
            newImageUrls = await Promise.all(uploadPromises);

            if (newImageUrls.length === 0) {
                throw new Error("Niciun URL de imagine nu a fost generat.");
            }

            const response = await api.put<Apartment>(
                `/apartments/${apartment._id}/add-images`,
                { newImageUrlsToAdd: newImageUrls },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setApartment(response.data);

            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setImageFiles([]);
            setImagePreviews([]);

            alert(`${newImageUrls.length} imagini incarcate si adaugate cu succes!`);

        } catch (err: any) {
            console.error("Eroare in procesul de incarcare a imaginilor:", err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            }
            else if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError("Eroare la incarcarea imaginilor. Va rugam incercati din nou.");
            }

            if (newImageUrls.length > 0 && err.response) {
                console.warn("Imagini incarcate in Firebase, dar eroare la salvarea referintelor in DB:", newImageUrls);
            }

        } finally {
            setIsUploadingImages(false);
        }
    };

    const deleteExistingImage = async (imageUrl: string) => {
        if (!apartment || !window.confirm("Sigur doriti sa stergeti aceasta imagine si din spatiul de stocare? Aceasta actiune este ireversibila.")) return;

        const savingKey = `deleteImage_${imageUrl}`;
        setIsSaving(prev => ({ ...prev, [savingKey]: true }));
        setError(null);

        try {

            const imageRef = ref(storage, imageUrl);

            await deleteObject(imageRef);
            const response = await api.put<{ apartment: Apartment }>(
                `/apartments/${apartment._id}/remove-image-reference`,
                { imageUrlToDelete: imageUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setApartment(response.data.apartment);
            alert("Imaginea a fost stearsa cu succes!");

        } catch (error: any) {
            console.error("Eroare la stergerea imaginii:", error);
            if (error.code === 'storage/object-not-found') {
                console.warn("Imaginea nu a fost gasita in Firebase Storage, se incearca stergerea referintei din DB.");
                setError("Imaginea nu a fost gasita in spatiul de stocare, dar referinta ar putea fi inca in baza de date.");
            } else {
                setError(error.response?.data?.message || error.message || "Nu s-a putut sterge imaginea.");
            }
        } finally {
            setIsSaving(prev => ({ ...prev, [savingKey]: false }));
        }
    };

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const resetFacilities = () => {
        if (!apartment || !apartment.facilities) {
            setSelectedFacilities([]);
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
        const facilitiesPayload: Partial<Apartment['facilities']> = {};

        ALL_POSSIBLE_FACILITIES_MAP.forEach(facilityMapItem => {
            facilitiesPayload[facilityMapItem.key] = selectedFacilities.includes(facilityMapItem.label);
        });

        handleSaveSection({ facilities: facilitiesPayload as Apartment['facilities'] }, 'Facilitati', setIsEditingFacilities);
    };

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

        const utilitiesPayload: Apartment['utilities'] = {
            internetPrice: internetP as number,
            TVPrice: tvP as number,
            waterPrice: waterP as number,
            gasPrice: gasP as number,
            electricityPrice: electricityP as number,
        };
        handleSaveSection({ utilities: utilitiesPayload }, 'Preturi Utilitati', setIsEditingUtilityPrices);
    };

    const resetRenovationYear = () => apartment && setEditableRenovationYear(parseNumericField(apartment.renovationYear));
    const saveRenovationYear = () => {
        const yearValue = parseIntOrNull(editableRenovationYear);
        if (editableRenovationYear !== "" && (yearValue === null || yearValue < 1800 || yearValue > new Date().getFullYear() + 10)) {
            setError("Anul renovarii nu este valid."); return;
        }
        handleSaveSection({ renovationYear: yearValue as number }, 'An Renovare', setIsEditingRenovationYear);
    }

    const handleCancelRental = async (rentalId: string) => {
        if (!window.confirm("Sunteti sigur ca doriti sa anulati aceasta chirie?")) return;
        setIsSaving(prev => ({ ...prev, cancelRental: true }));
        try {
            await api.patch(`/rentals/${rentalId}/cancel-by-owner`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Chiria a fost anulata.");
            fetchCurrentRentals();
            fetchRentalHistory(rentalHistoryPage);
        } catch (err: any) {
            console.error("Eroare la anularea chiriei:", err);
            setError(err.response?.data?.message || "Nu s-a putut anula chiria.");
        } finally {
            setIsSaving(prev => ({ ...prev, cancelRental: false }));
        }
    };

    const handleDeleteApartment = async () => {
        if (!apartment || !window.confirm("ATENtIE! Sigur doriti sa stergeti definitiv acest apartament si toate datele asociate (chirii, etc.)? Aceasta actiune este ireversibila!")) return;
        setIsSaving(prev => ({ ...prev, deleteApartment: true }));
        try {
            apartment.images.map((img) => {
                deleteExistingImage(img);
            });
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


    if (loading && !apartment) return <div className="owner-apartment-details-container"><p>Se incarca detaliile...</p></div>;
    if (!apartment) return <div className="owner-apartment-details-container"><p className="error-message">{error || "Apartamentul nu a fost gasit."}</p></div>;

    return (
        <div className="owner-apartment-details-container">
            <button onClick={() => navigate("/owner/apartments")} className="back-button general-button">
                ← inapoi la lista
            </button>
            {conversationId && (
                <button
                    onClick={() => navigate(`/chat/${conversationId}`)}
                    className="general-button"
                >
                    Vezi Conversatia
                </button>
            )}
            <h1>Editare Apartament: {apartment.location}</h1>
            {error && <p className="error-message global-error-details">{error}</p>}

            <section className="details-section">
                <h2>Informatii Generale</h2>
                <p><strong>Locatie:</strong> {apartment.location || "N/A"}</p>
                <p><strong>Camere:</strong> {apartment.numberOfRooms || "N/A"}</p>
                <p><strong>Bai:</strong> {apartment.numberOfBathrooms || "N/A"}</p>
                <p><strong>Etaj:</strong> {apartment.floorNumber || "N/A"}</p>
                <p><strong>Suprafata:</strong> {apartment.totalSurface || "N/A"} mp</p>
                <p><strong>An constructie:</strong> {apartment.constructionYear || "N/A"}</p>
            </section>

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

            < section className="details-section" >
                <h2>Facilitati</h2>
                {
                    isEditingFacilities ? (
                        <div className="edit-mode-form">
                            <div className="facilities-checkbox-grid">
                                {ALL_POSSIBLE_FACILITIES_MAP.map(facilityMapItem => (
                                    <label key={facilityMapItem.key} className="facility-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedFacilities.includes(facilityMapItem.label)}
                                            onChange={() => handleFacilityToggle(facilityMapItem.label)}
                                            disabled={isSaving.Facilitati}
                                        />
                                        {facilityMapItem.label}
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
                            {selectedFacilities.length > 0 ? (
                                <ul className="facilities-list-display">{selectedFacilities.map(label => <li key={label}>{label}</li>)}</ul>
                            ) : <p>Nicio facilitate selectata.</p>}
                            <button onClick={() => setIsEditingFacilities(true)} className="edit-button general-button">Modifica Facilitati</button>
                        </>
                    )
                }
            </section >

            <section className="details-section">
                <h2>Preturi Utilitati (RON/luna)</h2>
                {isEditingUtilityPrices ? (
                    <div className="edit-mode-form">
                        <div className="utility-price-item-edit">
                            <label htmlFor="internetPriceEdit"><strong>Internet:</strong></label>
                            <input id="internetPriceEdit" type="number" placeholder="Pret Internet" value={editableInternetPrice} onChange={e => setEditableInternetPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="tvPriceEdit"><strong>TV:</strong></label>
                            <input id="tvPriceEdit" type="number" placeholder="Pret TV" value={editableTVPrice} onChange={e => setEditableTVPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="waterPriceEdit"><strong>Apa:</strong></label>
                            <input id="waterPriceEdit" type="number" placeholder="Pret Apa" value={editableWaterPrice} onChange={e => setEditableWaterPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="gasPriceEdit"><strong>Gaz:</strong></label>
                            <input id="gasPriceEdit" type="number" placeholder="Pret Gaz" value={editableGasPrice} onChange={e => setEditableGasPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="utility-price-item-edit">
                            <label htmlFor="electricityPriceEdit"><strong>Electricitate:</strong></label>
                            <input id="electricityPriceEdit" type="number" placeholder="Pret Electricitate" value={editableElectricityPrice} onChange={e => setEditableElectricityPrice(e.target.value)} disabled={isSaving['Preturi Utilitati']} />
                        </div>
                        <div className="form-actions">
                            <button onClick={saveAllUtilityPrices} disabled={isSaving['Preturi Utilitati']} className="save-button general-button">{isSaving['Preturi Utilitati'] ? "Salv..." : "Salveaza Preturi Utilitati"}</button>
                            <button onClick={() => handleCancelEdit(setIsEditingUtilityPrices, resetUtilityPrices)} disabled={isSaving['Preturi Utilitati']} className="cancel-button general-button">Anuleaza</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p><strong>Internet:</strong> {apartment.utilities?.internetPrice ?? "N/A"} RON</p>
                        <p><strong>TV:</strong> {apartment.utilities?.TVPrice ?? "N/A"} RON</p>
                        <p><strong>Apa:</strong> {apartment.utilities?.waterPrice ?? "N/A"} RON</p>
                        <p><strong>Gaz:</strong> {apartment.utilities?.gasPrice ?? "N/A"} RON</p>
                        <p><strong>Electricitate:</strong> {apartment.utilities?.electricityPrice ?? "N/A"} RON</p>
                        <button onClick={() => setIsEditingUtilityPrices(true)} className="edit-button general-button">Modifica Preturi Utilitati</button>
                    </>
                )}
            </section>

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

            < div className="rentals-section-container" >
                <section className="details-section current-rentals">
                    <h2>Chiriasi Actuali & Urmatori</h2>
                    {loadingRentals && <p>Se incarca...</p>}
                    {!loadingRentals && currentRentals.length > 0 ? (
                        <ul>
                            {currentRentals.map(rental => (
                                <li key={rental._id}>
                                    Chirias:{" "}
                                    <button
                                        onClick={() => initiatePrivateChat(rental.clientData._id)}
                                        disabled={isLoadingPrivate}
                                    >
                                        {rental.clientData?.fullName || "N/A"}
                                    </button>

                                    <br />
                                    Perioada: {new Date(rental.checkIn).toLocaleDateString()} - {new Date(rental.checkOut).toLocaleDateString()} <br />
                                    Status: {rental.derivedStatus}
                                    {(rental.derivedStatus === 'Activ' || rental.derivedStatus === 'Viitor') && (
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
                                        Chirias: {rental.clientData?.fullName || "N/A"} <br />
                                        Perioada: {new Date(rental.checkIn || rental.checkIn).toLocaleDateString()} - {new Date(rental.checkOut || rental.checkOut).toLocaleDateString()} <br />
                                        Pret final: {rental.finalPrice} RON <br />
                                        Status: {rental.derivedStatus}
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
            </div>

            <section className="details-section reviews-owner-dashboard">
                <h2>Recenzii Primite ({reviews.length})</h2>
                {loadingReviews && <p>Se incarca recenziile...</p>}
                {reviewError && <p className="error-message">{reviewError}</p>}
                {!loadingReviews && !reviewError && apartmentId && (
                    <ReviewList
                        reviews={reviews}
                        currentUserId={user?._id || null}
                        onReviewDeleted={handleReviewDeleted}
                    />
                )}
            </section>

            < section className="details-section delete-apartment-section" >
                <h2>Sterge Listarea Apartamentului</h2>
                <p className="warning-text">Aceasta actiune este ireversibila si va sterge toate datele asociate cu acest apartament.</p>
                <button onClick={handleDeleteApartment} disabled={isSaving.deleteApartment} className="delete-apartment-button general-button">
                    {isSaving.deleteApartment ? "Se sterge..." : "sterge Apartamentul Definitiv"}
                </button>
            </section >
        </div>
    );
};

export default OwnerApartmentDetails;