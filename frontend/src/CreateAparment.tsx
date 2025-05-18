import React, { useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
// Import the CSS file (ensure the path is correct)
import "./CreateApartment.css"; // Or './OwnerListNewApartment.css' if you create a new file
import { useNavigate } from "react-router-dom";
import { storage } from "./firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const OwnerListNewApartment: React.FC = () => {
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // useEffect(() => { ... }, [user, token]); // Your existing useEffect

    const [formData, setFormData] = useState({
        // ... your initial form data state
        numberOfRooms: "",
        numberOfBathrooms: "",
        floorNumber: "",
        parking: false,
        petFriendly: false,
        location: "",
        price: "",
        totalSurface: "",
        elevator: false,
        constructionYear: "",
        renovationYear: "",
        internetPrice: "",
        TVPrice: "",
        waterPrice: "",
        gasPrice: "",
        electricityPrice: "",
        airConditioning: false,
        balcony: false,
        discount1: 0,
        discount2: 0,
        discount3: 0,
        discount4: 0
    });

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [message, setMessage] = useState("");


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type, value, checked } = e.target as HTMLInputElement;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === "checkbox" ? checked : value,
        }));
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
        if (parseFloat(formData.price) <= 0) {
            setMessage("Pretul trebuie sa fie pozitiv.");
            return;
        }
        // Add more specific validations here...

        try {

            // upload toate imaginile în paralel
            const imageUrls = await Promise.all(imageFiles.map(f => uploadFile(f)));

            await api.post(
                `/new-apartment`,
                { ownerId: user?._id, ...formData, images: imageUrls },
                {
                    headers: { Authorization: `Bearer ${token}` }
                },
            );

            setMessage("Apartament listat cu succes!");
            // Optionally reset form or navigate away
            setFormData({
                // Reset form
                numberOfRooms: "",
                numberOfBathrooms: "",
                floorNumber: "",
                parking: false,
                petFriendly: false,
                location: "",
                price: "",
                totalSurface: "",
                elevator: false,
                constructionYear: "",
                renovationYear: "",
                internetPrice: "",
                TVPrice: "",
                waterPrice: "",
                gasPrice: "",
                electricityPrice: "",
                airConditioning: false,
                balcony: false,
                discount1: 0,
                discount2: 0,
                discount3: 0,
                discount4: 0
            });
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
                            type="number"
                            id="numberOfRooms"
                            name="numberOfRooms"
                            min="1"
                            step="1"
                            value={formData.numberOfRooms}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="numberOfBathrooms">Numar bai:*</label>
                        <input
                            type="number"
                            id="numberOfBathrooms"
                            name="numberOfBathrooms"
                            min="1"
                            step="1"
                            value={formData.numberOfBathrooms}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="floorNumber">Etaj:*</label>
                        <input
                            type="number"
                            id="floorNumber"
                            name="floorNumber" /* Add min/max if applicable */
                            min="0"
                            step="1"
                            value={formData.floorNumber}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Locatie */}
                    <div className="form-group">
                        <label htmlFor="location">Adresa:*</label>
                        <input
                            type="text"
                            id="location"
                            name="location"
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
                            type="number"
                            id="price"
                            name="price"
                            min="0"
                            step="1"
                            value={formData.price}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Suprafata totala */}
                    <div className="form-group">
                        <label htmlFor="totalSurface">Suprafata totala (mp):*</label>
                        <input
                            type="number"
                            id="totalSurface"
                            name="totalSurface"
                            min="1"
                            step="0.1"
                            value={formData.totalSurface}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Anul constructiei */}
                    <div className="form-group">
                        <label htmlFor="constructionYear">Anul constructiei:*</label>
                        <input
                            type="number"
                            id="constructionYear"
                            name="constructionYear"
                            min="1800"
                            max={new Date().getFullYear()}
                            step="1"
                            value={formData.constructionYear}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {/* Anul renovarii - optional */}
                    <div className="form-group">
                        <label htmlFor="renovationYear">Anul renovarii (optional):</label>
                        <input
                            type="number"
                            id="renovationYear"
                            name="renovationYear"
                            min="1800"
                            max={new Date().getFullYear()}
                            step="1"
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
                                type="number"
                                id="internetPrice"
                                name="internetPrice"
                                min="0"
                                step="0.01"
                                placeholder="ex: 0.05"
                                value={formData.internetPrice}
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
                                value={formData.TVPrice}
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
                                value={formData.waterPrice}
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
                                value={formData.gasPrice}
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
                                value={formData.electricityPrice}
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
                                value={formData.discount1}
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
                                value={formData.discount2}
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
                                value={formData.discount3}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="discount4">Discount pentru categoria 4 (5.00 - 8.49) (%):*</label>
                            <input
                                type="number"
                                id="discount4"
                                name="discount4"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="ex 5"
                                value={formData.discount4}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* --- Facilitati --- */}
                    <h2 className="form-section-title">Facilitati</h2>
                    {/* Checkbox Grouping */}
                    <div className="form-group-checkbox-grid">
                        {/* Parcare */}
                        <div className="form-group form-group-checkbox">
                            <input
                                type="checkbox"
                                id="parking"
                                name="parking"
                                checked={formData.parking}
                                onChange={handleChange}
                            />
                            <label htmlFor="parking">Parcare inclusa</label>
                        </div>

                        {/* Pet friendly */}
                        <div className="form-group form-group-checkbox">
                            <input
                                type="checkbox"
                                id="petFriendly"
                                name="petFriendly"
                                checked={formData.petFriendly}
                                onChange={handleChange}
                            />
                            <label htmlFor="petFriendly">Accepta animale</label>
                        </div>

                        {/* Lift */}
                        <div className="form-group form-group-checkbox">
                            <input
                                type="checkbox"
                                id="elevator"
                                name="elevator"
                                checked={formData.elevator}
                                onChange={handleChange}
                            />
                            <label htmlFor="elevator">Lift</label>
                        </div>

                        {/* Aer conditionat */}
                        <div className="form-group form-group-checkbox">
                            <input
                                type="checkbox"
                                id="airConditioning"
                                name="airConditioning"
                                checked={formData.airConditioning}
                                onChange={handleChange}
                            />
                            <label htmlFor="airConditioning">Aer conditionat</label>
                        </div>

                        {/* Balcon */}
                        <div className="form-group form-group-checkbox">
                            <input
                                type="checkbox"
                                id="balcony"
                                name="balcony"
                                checked={formData.balcony}
                                onChange={handleChange}
                            />
                            <label htmlFor="balcony">Balcon</label>
                        </div>
                    </div>{" "}
                    {/* End checkbox grid */}

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
                            <p>{imageFiles.length} fișier(e) selectat(e)</p>
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
