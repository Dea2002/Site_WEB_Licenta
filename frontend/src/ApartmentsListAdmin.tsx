// import React, { useEffect, useState, useContext } from "react";
import React from "react";
// import axios from "axios";
// import { AuthContext } from "./AuthContext";
import "./ApartmentsListAdmin.css";
// import { Apartment } from "./types";

const ApartmentsListAdmin: React.FC = () => {
    // const { token } = useContext(AuthContext);
    // const [apartments, setApartments] = useState<Apartment[]>([]);
    // const [loading, setLoading] = useState<boolean>(true);
    // const [error, setError] = useState<string>(""); // Pentru a gestiona erorile
    // const [successMessage, setSuccessMessage] = useState<string>(""); // Stare pentru mesajul de succes

    // useEffect(() => {
    //     axios
    //         .get("/admin/apartments", {
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         })
    //         .then((response) => {
    //             setApartments(response.data);
    //             console.log(response.data);
    //             setLoading(false);
    //         })
    //         .catch((error) => {
    //             console.error("Eroare la obtinerea apartamentelor:", error);
    //             setLoading(false);
    //         });
    // }, [token]);

    // const handleStatusChange = (
    //     id: string,
    //     newStatus: "disponibil" | "indisponibil",
    //     reason?: string,
    // ) => {
    //     axios
    //         .put(
    //             `/admin/apartments/${id}/status`,
    //             { status: newStatus, reason },
    //             {
    //                 headers: {
    //                     Authorization: `Bearer ${token}`,
    //                     "Content-Type": "application/json",
    //                 },
    //             },
    //         )
    //         .then((response) => {
    //             // Actualizeaza apartamentul cu datele primite din backend
    //             const updatedApartment = response.data;
    //             setApartments((prevApartments) =>
    //                 prevApartments.map((apartment) =>
    //                     apartment._id === id ? { ...apartment, ...updatedApartment } : apartment,
    //                 ),
    //             );
    //             setSuccessMessage("Statusul a fost actualizat cu succes!");
    //             // sterge mesajul dupa 3 secunde
    //             setTimeout(() => setSuccessMessage(""), 3000);
    //         })
    //         .catch((error) => {
    //             console.error("Eroare la actualizarea statusului:", error);
    //             setError("Nu s-a putut actualiza statusul apartamentului.");
    //         });
    // };

    // if (loading) {
    //     return <p>Se incarca apartamentele...</p>;
    // }

    return (
        <></>
        // <div className="admin-apartments-container">
        //     <h1>Lista de Apartamente</h1>
        //     {successMessage && <div className="success-message">{successMessage}</div>}
        //     <div className="apartments-list">
        //         {apartments.map((apartment) => (
        //             <div key={apartment._id} className="apartment-card">
        //                 <img
        //                     src={`/Poze_apartamente/${apartment.image}`}
        //                     alt={apartment.ownerInformation?.fullName}
        //                 />
        //                 {/* <h2>{apartment.name}</h2> */}
        //                 <p>
        //                     <strong>Proprietar:</strong> {apartment.ownerInformation?.fullName}
        //                 </p>
        //                 <p>
        //                     <strong>Email:</strong> {apartment.ownerInformation?.email}
        //                 </p>
        //                 <div className="status-selector">
        //                     <label>Status:</label>
        //                     <select
        //                         value={apartment.status}
        //                         onChange={(e) => {
        //                             const newStatus = e.target.value as
        //                                 | "disponibil"
        //                                 | "indisponibil";
        //                             if (newStatus === "disponibil") {
        //                                 // Daca statusul devine disponibil, resetam motivul
        //                                 handleStatusChange(apartment._id, newStatus, "");
        //                             } else {
        //                                 // Daca statusul devine indisponibil, pastram motivul existent sau cerem un motiv nou
        //                                 handleStatusChange(
        //                                     apartment._id,
        //                                     newStatus,
        //                                     apartment.reason || "",
        //                                 );
        //                             }
        //                         }}
        //                     >
        //                         <option value="disponibil">Disponibil</option>
        //                         <option value="indisponibil">Indisponibil</option>
        //                     </select>
        //                 </div>
        //                 {/* Afisam campul pentru motiv daca apartamentul este indisponibil */}
        //                 {apartment.status === "indisponibil" && (
        //                     <div className="reason-input">
        //                         <label>Motiv:</label>
        //                         <input
        //                             type="text"
        //                             value={apartment.reason || ""}
        //                             onChange={(e) => {
        //                                 console.log("Tasta");
        //                                 const reason = e.target.value;
        //                                 handleStatusChange(apartment._id, apartment.status, reason);
        //                             }}
        //                             onKeyPress={(e) => {
        //                                 if (e.key === "Enter") {
        //                                     handleStatusChange(
        //                                         apartment._id,
        //                                         apartment.status,
        //                                         apartment.reason || "",
        //                                     );
        //                                 }
        //                             }}
        //                         />
        //                     </div>
        //                 )}
        //             </div>
        //         ))}
        //     </div>
        // </div>
    );
};

export default ApartmentsListAdmin;
