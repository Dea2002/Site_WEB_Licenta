import React, { useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./FacultyMarks.css";


interface StudentInfo {
    fullName: string;
    email: string;
    numar_matricol: string;
    anUniversitar: string;
    medie: string;
}
interface MarkRequest {
    _id: string;
    numeStudent: string;
    emailStudent: string;
    anUniversitar: string;
    numar_matricol: string;
    studentId: string;
    medie: string;
    faculty: string;
    facultyId: string;
    requestDate: string;
    studentInfo: StudentInfo;
}

const FacultyMarks: React.FC = () => {

    const [requests, setRequests] = useState<MarkRequest[]>([]);
    const { faculty, token } = useContext(AuthContext);
    const [error, setError] = useState<string | null>(null);

    // Functie pentru a formata data (optional)
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("ro-RO", {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return "Data invalida";
        }
    };

    // functie pentru a face fetch la cereri
    const fetchMarkRequests = async () => {
        if (!token || !faculty?._id) {
            setError("Utilizator neautentificat sau date lipsa.");
            return;
        }

        try {
            const response = await api.get<MarkRequest[]>(
                `/faculty/get_mark_requests/${faculty!._id}`
            );

            setRequests(response.data);
        } catch (err: any) {
            console.error("Eroare la fetch cereri de asociere:", err);
        }
    };

    useState(() => {
        fetchMarkRequests();
    }), [];

    const handleApprove = async (requestId: string) => {
        if (!token) return;
        try {

            await api.put(
                `/faculty/mark/${requestId}/approve`,
                { header: { Authorization: `Bearer ${token}` } }
            );

            setRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));

        } catch (err: any) {
            console.error("Eroare la aprobarea cererii: ", err);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!token) return;
        try {
            await api.put(
                `/faculty/mark/${requestId}/reject`,
                { header: { Authorization: `Bearer ${token}` } }
            );

            setRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));

        } catch (err: any) {
            console.error("Eroare la respingerea cererii: ", err);
        }
    };

    return (
        <div className="faculty-marks-container">
            <h1>Cereri de Actualizare Medii Studenti</h1>

            {error && <p className="error-message">{error}</p>}

            {!error && (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        <p>Nu exista cereri de asociere in asteptare.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nume Student</th>
                                    <th>Email Student</th>
                                    <th>Numar Matricol</th>
                                    <th>Anul Universitar</th>
                                    <th>Medie</th>
                                    <th>Data Cererii</th>
                                    <th>Actiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Mapam peste cererile primite (presupuse a fi pending) */}
                                {requests.map((request) => (
                                    <tr key={request._id}>
                                        <td>{request.studentInfo.fullName}</td>
                                        <td>{request.studentInfo.email}</td>
                                        <td>{request.studentInfo.numar_matricol ? request.studentInfo.numar_matricol : "Neinregistrat"}</td>
                                        <td>{request.studentInfo.anUniversitar}</td>
                                        <td>{request.studentInfo.medie}</td>
                                        <td>{formatDate(request.requestDate)}</td>
                                        <td>
                                            {/* Afisam butoanele mereu, deoarece presupunem ca toate cererile listate sunt pending */}
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleApprove(request._id)} // Trimitem doar ID-ul cererii
                                                    className="approve-button"
                                                >
                                                    Aproba
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request._id)}
                                                    className="reject-button"

                                                >
                                                    Respinge
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default FacultyMarks;