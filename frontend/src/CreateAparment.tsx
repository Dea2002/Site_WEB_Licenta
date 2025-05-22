import React, { useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
// Import the CSS file (ensure the path is correct)
import "./CreateApartment.css"; // Or './OwnerListNewApartment.css' if you create a new file
import { useNavigate } from "react-router-dom";
import { storage } from "./firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// 1. Definește starea inițială a formularului
const initialFormData = {
    numberOfRooms: "",
    numberOfBathrooms: "",
    floorNumber: "",
    location: "",
    price: 0,
    totalSurface: "",
    constructionYear: "",
    renovationYear: "", // Optional
    discounts: {
        discount1: 0,
        discount2: 0,
        discount3: 0,
    },
    utilities: {
        internetPrice: 0.0,
        TVPrice: 0.0,
        waterPrice: 0.0,
        gasPrice: 0.0,
        electricityPrice: 0.0,
    },
    facilities: {
        wifi: false,
        parking: false,
        airConditioning: false,
        tvCable: false,
        laundryMachine: false,
        fullKitchen: false,
        balcony: false,
        petFriendly: false,
        pool: false,
        gym: false,
        elevator: false,
        terrace: false,
        bikeStorage: false,
        storageRoom: false,
        rooftop: false,
        fireAlarm: false,
        smokeDetector: false,
        intercom: false,
        videoSurveillance: false,
        soundproofing: false,
        underfloorHeating: false,
    },
};

// Definirea tipului pentru formData pentru o mai bună verificare a tipurilor
type FormData = typeof initialFormData;
type FacilityKey = keyof FormData['facilities'];
type DiscountKey = keyof FormData['discounts'];
type UtilityKey = keyof FormData['utilities'];

// 2. Definește opțiunile pentru facilități
const facilityOptions: { id: FacilityKey; label: string }[] = [
    { id: 'parking', label: 'Parcare inclusa' },
    { id: 'videoSurveillance', label: 'Supraveghere video' },
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'airConditioning', label: 'Aer Conditionat' },
    { id: 'tvCable', label: 'TV Cablu' },
    { id: 'laundryMachine', label: 'Masina de spalat rufe' },
    { id: 'fullKitchen', label: 'Bucatarie complet utilata' },
    { id: 'fireAlarm', label: 'Alarma de incendiu' },
    { id: 'smokeDetector', label: 'Detector de fum' },
    { id: 'balcony', label: 'Balcon' },
    { id: 'terrace', label: 'Terasa' },
    { id: 'soundproofing', label: 'Izolat fonic' },
    { id: 'underfloorHeating', label: 'Incalzire in pardoseala' },
    { id: 'petFriendly', label: 'Permite animale' },
    { id: 'elevator', label: 'Lift' },
    { id: 'pool', label: 'Piscina' },
    { id: 'gym', label: 'Sala de fitness' },
    { id: 'bikeStorage', label: 'Parcare biciclete' },
    { id: 'storageRoom', label: 'Camera depozitare' },
    { id: 'rooftop', label: 'Acces acoperis' },
    { id: 'intercom', label: 'Interfon' },
];

const OwnerListNewApartment: React.FC = () => {
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [message, setMessage] = useState("");


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type, value } = e.target;
        const checked = (e.target as HTMLInputElement).checked; // Specific pentru checkboxes

        // Verifică dacă `name` aparține unui sub-obiect (facilities, discounts, utilities)
        if (name in formData.facilities) {
            setFormData(prevData => ({
                ...prevData,
                facilities: {
                    ...prevData.facilities,
                    [name as FacilityKey]: checked, // Doar pentru checkboxes
                },
            }));
        } else if (name in formData.discounts) {
            setFormData(prevData => ({
                ...prevData,
                discounts: {
                    ...prevData.discounts,
                    [name as DiscountKey]: parseFloat(value) || 0,
                },
            }));
        } else if (name in formData.utilities) {
            setFormData(prevData => ({
                ...prevData,
                utilities: {
                    ...prevData.utilities,
                    [name as UtilityKey]: parseFloat(value) || 0,
                },
            }));
        } else {
            // Câmpuri de la primul nivel (numberOfRooms, location, price, etc.)
            setFormData(prevData => ({
                ...prevData,
                [name]: type === 'number' || e.target.type === 'number'
                    ? (name === 'price' || name === 'totalSurface' ? parseFloat(value) : parseInt(value, 10)) // price și totalSurface pot fi float
                    : value,
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        // multiple
        setImageFiles(Array.from(e.target.files));
    };

    const uploadFile = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const storageRef = ref(storage, `apartments/${Date.now()}_${file.name}`);
            const task = uploadBytesResumable(storageRef, file);
            task.on(
                "state_changed",
                () => { },
                reject,
                () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
            );
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(""); // Clear previous messages

        // Basic Validation Example (add more as needed)
        if (
            parseInt(formData.constructionYear) < 1800 ||
            parseInt(formData.constructionYear) > new Date().getFullYear()
        ) {
            setMessage("Anul constructiei este invalid.");
            return;
        }
        if (
            formData.renovationYear &&
            (parseInt(formData.renovationYear) < parseInt(formData.constructionYear) ||
                parseInt(formData.renovationYear) > new Date().getFullYear())
        ) {
            setMessage("Anul renovarii este invalid.");
            return;
        }
        if (formData.price <= 0) {
            setMessage("Pretul trebuie sa fie pozitiv.");
            return;
        }
        // Add more specific validations here...

        try {

            // upload toate imaginile in paralel
            const imageUrls = await Promise.all(imageFiles.map(f => uploadFile(f)));


            //!!!!! Construiește payload-ul final pentru API
            // Asigură-te că trimiți datele în formatul așteptat de backend
            // (aplatizează `discounts`, `utilities`, `facilities` dacă e necesar, sau trimite-le ca obiecte)
            // Exemplu: backend-ul așteaptă cheile direct (discount1, parking, internetPrice)
            const payload = {
                ownerId: user?._id,
                numberOfRooms: parseInt(formData.numberOfRooms) || 0,
                numberOfBathrooms: parseInt(formData.numberOfBathrooms) || 0,
                floorNumber: parseInt(formData.floorNumber) || 0, // Poate fi și negativ (demisol)
                location: formData.location,
                price: formData.price,
                totalSurface: parseFloat(formData.totalSurface) || 0,
                constructionYear: parseInt(formData.constructionYear) || 0,
                renovationYear: formData.renovationYear ? parseInt(formData.renovationYear) : null, // Trimite null dacă e gol
                // Extrage valorile din obiectele imbricate
                ...formData.discounts,
                ...formData.utilities,
                ...formData.facilities,
                images: imageUrls,
            };

            // SAU dacă backend-ul așteaptă obiectele `discounts`, `utilities`, `facilities`:
            // const payload = {
            //     ownerId: user?._id,
            //     numberOfRooms: parseInt(formData.numberOfRooms) || 0,
            //     numberOfBathrooms: parseInt(formData.numberOfBathrooms) || 0,
            //     floorNumber: parseInt(formData.floorNumber) || 0,
            //     location: formData.location,
            //     price: formData.price,
            //     totalSurface: parseFloat(formData.totalSurface) || 0,
            //     constructionYear: parseInt(formData.constructionYear) || 0,
            //     renovationYear: formData.renovationYear ? parseInt(formData.renovationYear) : null,
            //     discounts: formData.discounts,
            //     utilities: formData.utilities,
            //     facilities: formData.facilities,
            //     images: imageUrls,
            // };

            await api.post(`/new-apartment`, payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage("Apartament listat cu succes!");
            // Optionally reset form or navigate away
            setFormData(initialFormData); // Reset form data
            setImageFiles([]); // Reset image files
            // navigate('/owner/dashboard'); // Example navigation
        } catch (error: any) {
            console.error("Eroare la listare apartament nou: ", error);
            setMessage(
                error.response?.data?.message ||
                "Eroare la listare apartament. Verificati consola.",
            );
        }
    };

    return (
        <div className="page-container">
            {" "}
            <div className="form-card-container">
                <h1>Listeaza un apartament nou</h1>
                {message && (
                    <div
                        className={`message ${message.includes("succes") ? "message-success" : "message-error"
                            }`}
                    >
                        {message}
                    </div>
                )}{" "}
                {/* Form for listing a new apartment */}
                <form onSubmit={handleSubmit} className="list-apartment-form">
                    <div className="form-group">
                        <label htmlFor="numberOfRooms">Numar camere:*</label>
                        <input
                            type="number" id="numberOfRooms" name="numberOfRooms"
                            min="1" step="1"
                            value={formData.numberOfRooms}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="numberOfBathrooms">Numar bai:*</label>
                        <input
                            type="number" id="numberOfBathrooms" name="numberOfBathrooms"
                            min="1" step="1"
                            value={formData.numberOfBathrooms}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="floorNumber">Etaj:*</label>
                        <input
                            type="number" id="floorNumber" name="floorNumber"
                            min="0" step="1"
                            value={formData.floorNumber}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Locatie */}
                    <div className="form-group">
                        <label htmlFor="location">Adresa:*</label>
                        <input
                            type="text" id="location" name="location"
                            placeholder="ex: Str. Exemplu Nr. 10, Bucuresti"
                            value={formData.location}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Pret */}
                    <div className="form-group">
                        <label htmlFor="price">Pret chirie (RON/camera/noapte):*</label>
                        <input
                            type="number" id="price" name="price"
                            min="0" step="1"
                            value={formData.price}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Suprafata totala */}
                    <div className="form-group">
                        <label htmlFor="totalSurface">Suprafata totala (mp):*</label>
                        <input
                            type="number" id="totalSurface" name="totalSurface"
                            min="1" step="0.1"
                            value={formData.totalSurface}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Anul constructiei */}
                    <div className="form-group">
                        <label htmlFor="constructionYear">Anul constructiei:*</label>
                        <input
                            type="number" id="constructionYear" name="constructionYear"
                            min="1800" max={new Date().getFullYear()} step="1"
                            value={formData.constructionYear}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Anul renovarii - optional */}
                    <div className="form-group">
                        <label htmlFor="renovationYear">Anul renovarii (optional):</label>
                        <input
                            type="number" id="renovationYear" name="renovationYear"
                            min="1800" max={new Date().getFullYear()} step="1"
                            value={formData.renovationYear}
                            onChange={handleChange}
                        />
                    </div>
                    {/* --- Costuri Utilitati --- */}
                    <h2 className="form-section-title">Costuri Utilitati Estimative</h2>
                    <div className="utility-cost-box">
                        {/* Campurile legate de costuri (internetPrice, TVPrice, waterPrice, etc.) */}
                        <div className="form-group">
                            <label htmlFor="internetPrice">Pret internet (RON/luna):*</label>
                            <input
                                type="number" id="internetPrice" name="internetPrice"
                                min="0" step="0.01"
                                placeholder="ex: 0.05"
                                value={formData.utilities.internetPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="TVPrice">Pret cablu TV (RON/luna):*</label>
                            <input
                                type="number"
                                id="TVPrice"
                                name="TVPrice"
                                min="0"
                                step="0.01"
                                placeholder="ex: 0.05"
                                value={formData.utilities.TVPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="waterPrice">Pret apa (RON/mc/luna):*</label>
                            <input
                                type="number"
                                id="waterPrice"
                                name="waterPrice"
                                min="0"
                                step="0.01"
                                placeholder="ex: 0.05"
                                value={formData.utilities.waterPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="gasPrice">Pret gaz (RON/kWh/luna):*</label>
                            <input
                                type="number"
                                id="gasPrice"
                                name="gasPrice"
                                min="0"
                                step="0.001"
                                placeholder="ex: 0.05"
                                value={formData.utilities.gasPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="electricityPrice">Pret curent (RON/kWh/luna):*</label>
                            <input
                                type="number"
                                id="electricityPrice"
                                name="electricityPrice"
                                min="0"
                                step="0.001"
                                placeholder="ex: 0.05"
                                value={formData.utilities.electricityPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Discount in functie de categorie de medie */}
                    <h2 className="form-section-title">Discount per categorie de medie:</h2>
                    <div className="utility-cost-box">
                        <div className="form-group">
                            <label htmlFor="discount1">Discount pentru categoria 1 (9.50 - 10.00) (%):*</label>
                            <input
                                type="number"
                                id="discount1"
                                name="discount1"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="ex 5"
                                value={formData.discounts.discount1}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="discount2">Discount pentru categoria 2 (9.00 - 9.49) (%):*</label>
                            <input
                                type="number"
                                id="discount2"
                                name="discount2"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="ex 5"
                                value={formData.discounts.discount2}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="discount3">Discount pentru categoria 3 (8.50 - 8.99) (%):*</label>
                            <input
                                type="number"
                                id="discount3"
                                name="discount3"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="ex 5"
                                value={formData.discounts.discount3}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* --- Facilitati (generate dinamic) --- */}
                    <h2 className="form-section-title">Facilitati</h2>
                    <div className="form-group-checkbox-grid">
                        {facilityOptions.map(facility => (
                            <div className="form-group form-group-checkbox" key={facility.id}>
                                <input
                                    type="checkbox"
                                    id={facility.id}
                                    name={facility.id} // Numele este cheia din formData.facilities
                                    checked={formData.facilities[facility.id]}
                                    onChange={handleChange}
                                />
                                <label htmlFor={facility.id}>{facility.label}</label>
                            </div>
                        ))}
                    </div>

                    {/* Imagini */}
                    <div className="form-group">
                        <h2 className="form-section-title">Imagini apartament:*</h2>
                        <input
                            type="file"
                            id="images"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            required
                        />
                        {imageFiles.length > 0 && (
                            <p>{imageFiles.length} fisier(e) selectat(e)</p>
                        )}
                    </div>


                    {/* Buton de submit */}
                    <button type="submit" className="submit-apartment">
                        Listeaza Apartamentul
                    </button>
                </form>
                {/* Optional: Link back to dashboard */}
                <button onClick={() => navigate("/owner-dashboard")} className="back-button">
                    Inapoi la Dashboard
                </button>
            </div>{" "}
            {/* End form-card-container */}
        </div> // End page-container
    );
};

export default OwnerListNewApartment;
