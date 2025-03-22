// frontend/src/DashboardOwner.tsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import "./DashboardOwner.css";
import { useNavigate } from "react-router-dom";

const OwnerListNewApartment: React.FC = () => {
    const { user, setUser, token } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        // if (user?.email) {
        //     axios
        //         .get(`http://localhost:5000/owner/dashboard/${user.email}`, {
        //             headers: { Authorization: `Bearer ${token}` },
        //         })
        //         .then((response) => {
        //             setApartmentsCount(response.data.count);
        //         })
        //         .catch((error) => {
        //             console.error("Eroare la preluarea numarului de apartamente:", error);
        //         });
        // }
    }, [user, token]);

    // initializeaza starea formularului cu date goale
    const [formData, setFormData] = useState({
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

    // Mesaj pentru feedback-ul utilizatorului
    const [message, setMessage] = useState("");

    // handle pentru schimbarea valorilor din formular
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type, value, checked } = e.target as HTMLInputElement;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                `http://localhost:5000/new-apartment`,
                { ownerId: user?._id, ...formData },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );
            setUser(response.data);

            // afiseaza mesaj de succes
            setMessage("apartament listat cu succes!");
        } catch (error: any) {
            console.error("Eroare la listare apartament nou: ", error);
            // afiseaza mesajul de eroare
            setMessage(error.response?.data?.message || "Eroare la listare apartament");
        }
    };

    return (
        <div>
            <Bara_nav_OwnerDashboard />
            <h1>Ce faci ma?</h1>
            <form onSubmit={handleSubmit} className="list-apartment-form">
                {/* numar camere */}
                <div className="form-group">
                    <label htmlFor="numberOfRooms">Numar camere:</label>
                    <input
                        type="number"
                        id="numberOfRooms"
                        name="numberOfRooms"
                        value={formData.numberOfRooms}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* numar bai */}
                <div className="form-group">
                    <label htmlFor="">Numar bai:</label>
                    <input
                        type="number"
                        id="numberOfBathrooms"
                        name="numberOfBathrooms"
                        value={formData.numberOfBathrooms}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* etaj */}
                <div className="form-group">
                    <label htmlFor="">Etajul:</label>
                    <input
                        type="number"
                        id="floorNumber"
                        name="floorNumber"
                        value={formData.floorNumber}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* parcare */}
                <div className="form-group">
                    <label htmlFor="">Parcare:</label>
                    <input
                        type="checkbox"
                        id="parking"
                        name="parking"
                        checked={formData.parking}
                        onChange={handleChange}
                    />
                </div>

                {/* pet friendly */}
                <div className="form-group">
                    <label htmlFor="">Se primesc si animale:</label>
                    <input
                        type="checkbox"
                        id="petFriendly"
                        name="petFriendly"
                        checked={formData.petFriendly}
                        onChange={handleChange}
                    />
                </div>

                {/* Locatie */}
                <div className="form-group">
                    <label htmlFor="">Locatie:</label>
                    <input
                        type="text" /* //!poate dat de catre alegere pe o harta???? */
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* pret */}
                <div className="form-group">
                    <label htmlFor="">Pret apartament:</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* suprafata totala */}
                <div className="form-group">
                    <label htmlFor="">Suprafata totala:</label>
                    <input
                        type="number"
                        id="totalSurface"
                        name="totalSurface"
                        value={formData.totalSurface}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* lift */}
                <div className="form-group">
                    <label htmlFor="">Dispune de lift:</label>
                    <input
                        type="checkbox"
                        id="elevator"
                        name="elevator"
                        checked={formData.elevator}
                        onChange={handleChange}
                    />
                </div>

                {/* anul constructiei */}
                <div className="form-group">
                    <label htmlFor="">Anul constructiei:</label>
                    <input
                        type="number"
                        id="constructionYear"
                        name="constructionYear"
                        value={formData.constructionYear}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* anul renovarii - optional */}
                <div className="form-group">
                    <label htmlFor="">Anul renovarii:</label>
                    <input
                        type="number"
                        id="renovationYear"
                        name="renovationYear"
                        value={formData.renovationYear}
                        onChange={handleChange}
                        // required
                    />
                </div>

                {/* pret abonament internet */}
                <div className="form-group">
                    <label htmlFor="">Pret abonament internet:</label>
                    <input
                        type="number"
                        id="internetPrice"
                        name="internetPrice"
                        value={formData.internetPrice}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* pret abonament cablu  */}
                <div className="form-group">
                    <label htmlFor="">Pret abonament cablu TV:</label>
                    <input
                        type="number"
                        id="TVPrice"
                        name="TVPrice"
                        value={formData.TVPrice}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* pret mc apa */}
                <div className="form-group">
                    <label htmlFor="">Pret mp apa:</label>
                    <input
                        type="number"
                        id="waterPrice"
                        name="waterPrice"
                        value={formData.waterPrice}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* pret kwh gaz */}
                <div className="form-group">
                    <label htmlFor="">Pret kWh gaz:</label>
                    <input
                        type="number"
                        id="gasPrice"
                        name="gasPrice"
                        value={formData.gasPrice}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* pret kwh curent */}
                <div className="form-group">
                    <label htmlFor="">Pret kWh curent:</label>
                    <input
                        type="number"
                        id="electricityPrice"
                        name="electricityPrice"
                        value={formData.electricityPrice}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* aer conditionat */}
                <div className="form-group">
                    <label htmlFor="">Aer conditionat:</label>
                    <input
                        type="checkbox"
                        id="airConditioning"
                        name="airConditioning"
                        checked={formData.airConditioning}
                        onChange={handleChange}
                    />
                </div>

                {/* balcon */}
                <div className="form-group">
                    <label htmlFor="">Balcon:</label>
                    <input
                        type="checkbox"
                        id="balcony"
                        name="balcony"
                        checked={formData.balcony}
                        onChange={handleChange}
                    />
                </div>

                {/* imagini */}
                <div className="form-group">
                    <label htmlFor="">Selfie cu bunica:</label>
                    <input
                        type="text" /* //! trebuie vazut cum se poate incarca o imagine */
                        id="image"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* se permite coleg de apartament? */}
                <div className="form-group">
                    <label htmlFor="">Coleg(i) de apartament:</label>
                    <input
                        type="checkbox"
                        id="colleagues"
                        name="colleagues"
                        checked={formData.colleagues}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="">Nume Coleg:</label>
                    <input
                        type="text"
                        id="colleaguesNames"
                        name="colleaguesNames"
                        value={formData.colleaguesNames}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* buton de submit */}
                <button type="submit" className="update-button">
                    Listeaza noul apartament
                </button>
            </form>
            {/* //! eventual un buton de revenire inapoi la dashboard? */}
        </div>
    );
};

export default OwnerListNewApartment;
