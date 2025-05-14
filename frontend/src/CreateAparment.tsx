import React, { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
// Import the CSS file (ensure the path is correct)
import "./CreateApartment.css"; // Or './OwnerListNewApartment.css' if you create a new file
import { useNavigate } from "react-router-dom";

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
        colleagues: false,
        colleaguesNames: "",
        image: "", // Consider changing input type to 'file' later
    });

    const [message, setMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type, value, checked } = e.target as HTMLInputElement;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // Pentru selectia de fisiere
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData((prevData) => ({
                ...prevData,
                image: e.target.files![0].name, // Store the file name or path
            }));
            console.log("Selected file:", e.target.files[0]);
        }
    };

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
            // Assuming 'image' is just a text field for now based on input type="text"
            await axios.post(
                `http://localhost:5000/new-apartment`,
                { ownerId: user?._id, ...formData },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            // Assuming the response contains the updated user or relevant data
            // setUser(response.data.user); // Adjust if needed based on API response

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
                colleagues: false,
                colleaguesNames: "",
                image: "",
            });
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
                        <label htmlFor="numberOfRooms">Numar camere:</label>
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
                        <label htmlFor="numberOfBathrooms">Numar bai:</label>
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
                        <label htmlFor="floorNumber">Etaj:</label>
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
                        <label htmlFor="location">Adresa / Locatie:</label>
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
                        <label htmlFor="price">Pret chirie (€/luna):</label>
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
                        <label htmlFor="totalSurface">Suprafata totala (mp):</label>
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
                        <label htmlFor="constructionYear">Anul constructiei:</label>
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
                            <label htmlFor="internetPrice">Pret internet (€/luna):</label>
                            <input
                                type="number"
                                id="internetPrice"
                                name="internetPrice"
                                min="0"
                                step="0.01"
                                value={formData.internetPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="TVPrice">Pret cablu TV (€/luna):</label>
                            <input
                                type="number"
                                id="TVPrice"
                                name="TVPrice"
                                min="0"
                                step="0.01"
                                value={formData.TVPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="waterPrice">Pret apa (€/mc):</label>
                            <input
                                type="number"
                                id="waterPrice"
                                name="waterPrice"
                                min="0"
                                step="0.01"
                                value={formData.waterPrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="gasPrice">Pret gaz (€/kWh):</label>
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
                            <label htmlFor="electricityPrice">Pret curent (€/kWh):</label>
                            <input
                                type="number"
                                id="electricityPrice"
                                name="electricityPrice"
                                min="0"
                                step="0.001"
                                placeholder="ex: 0.15"
                                value={formData.electricityPrice}
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
                    {/* IMPORTANT: Input type 'file' requires different handling for submission (FormData) */}
                    <div className="form-group">
                        <label htmlFor="image">Imagine principala:</label>
                        <input
                            type="file" // Changed to file
                            id="image"
                            name="image"
                            accept="image/png, image/jpeg, image/webp" // Specify accepted types
                            // value={formData.image} // Value cannot be controlled for type="file"
                            onChange={handleFileChange} // Use a dedicated handler for files
                        // required // Consider if one image is mandatory
                        />
                        {/* You might want to show a preview of the selected image here */}
                    </div>
                    {/* --- Colegi --- */}
                    <h2 className="form-section-title">Colegi de apartament</h2>
                    {/* Se permite coleg de apartament? */}
                    <div className="form-group form-group-checkbox">
                        <input
                            type="checkbox"
                            id="colleagues"
                            name="colleagues"
                            checked={formData.colleagues}
                            onChange={handleChange}
                        />
                        <label htmlFor="colleagues">Se cauta/accepta coleg(i)?</label>
                    </div>
                    {/* Show name input only if colleagues checkbox is checked */}
                    {formData.colleagues && (
                        <div className="form-group">
                            <label htmlFor="colleaguesNames">
                                Nume coleg(i) existent(i) (optional):
                            </label>
                            <input
                                type="text"
                                id="colleaguesNames"
                                name="colleaguesNames"
                                placeholder="ex: Ana Popescu (daca exista deja)"
                                value={formData.colleaguesNames}
                                onChange={handleChange}
                            // required={formData.colleagues} // Make required only if checkbox is checked
                            />
                        </div>
                    )}
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
