import React, { useEffect, useContext, useState } from "react";
import "./DashboardFaculty.css";
import { api } from "./api";
import { AuthContext } from "./AuthContext";

interface Student {
    _id: string;
    fullName: string;
    email: string;
    faculty: string;
    anUniversitar: number;
    faculty_valid: boolean;
    medie: string;
    numar_matricol: string;
}

const DashboardFaculty: React.FC = () => {
    const { token } = useContext(AuthContext);

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchStudents = () => {
        if (!token) {
            setError("Autentificare necesara.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        api.get<Student[]>('/faculty/all_students')
            .then(response => {
                setStudents(response.data);
            })
            .catch(err => {
                console.error("Eroare la preluarea studentilor:", err);
                setError(err.response?.data?.message || "Nu s-au putut incarca studentii.");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStudents();
    }, [token]);

    const handleInvalidateFaculty = async (studentId: string) => {
        if (!token) {
            setError("Autentificare necesara pentru aceasta actiune.");
            return;
        }
        if (!window.confirm(`Esti sigur ca vrei sa invalidezi facultatea pentru acest student? Acest lucru il va impiedica sa rezerve apartamente cu discount de student pana la o noua validare.`)) {
            return;
        }

        setUpdatingStudentId(studentId);
        setError(null);
        setSuccessMessage(null);

        try {
            await api.patch(`/faculty/students/${studentId}/invalidate`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setStudents(prevStudents =>
                prevStudents.map(student =>
                    student._id === studentId ? { ...student, faculty_valid: false } : student
                )
            );
            setSuccessMessage("Validarea facultatii pentru student a fost revocata cu succes.");
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err: any) {
            console.error("Eroare la invalidarea facultatii studentului:", err);
            setError(err.response?.data?.message || "Nu s-a putut actualiza statusul studentului.");
            setTimeout(() => setError(null), 5000);
        } finally {
            setUpdatingStudentId(null);
        }
    };

    if (loading) {
        return <div className="dashboard-faculty-container"><p>Se incarca lista de studenti...</p></div>;
    }

    if (error && students.length === 0) {
        return <div className="dashboard-faculty-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="dashboard-faculty-container">
            <h1>Panou de Control Facultate - Lista Studenti</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <p className="error-message global-error">{error}</p>}

            {students.length > 0 ? (
                <div className="students-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nume Complet</th>
                                <th>Email</th>
                                <th>Numar matricol</th>
                                <th>Medie</th>
                                <th>An Studiu</th>
                                <th>Status Validare Facultate</th>
                                <th>Actiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student._id} className={!student.faculty_valid ? 'student-invalidated' : ''}>
                                    <td>{student.fullName}</td>
                                    <td>{student.email}</td>
                                    <td>{student.numar_matricol}</td>
                                    <td>{student.medie}</td>
                                    <td>{student.anUniversitar || 'N/A'}</td>
                                    <td>
                                        {student.faculty_valid ?
                                            <span className="status-valid">Validata</span> :
                                            <span className="status-invalid">Invalidata</span>
                                        }
                                    </td>
                                    <td>
                                        {student.faculty_valid && (
                                            <button
                                                onClick={() => handleInvalidateFaculty(student._id)}
                                                disabled={updatingStudentId === student._id}
                                                className="button-invalidate"
                                            >
                                                {updatingStudentId === student._id ? "Se proceseaza..." : "Invalideaza Facultate"}
                                            </button>
                                        )}
                                        {!student.faculty_valid && (
                                            <span>-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !error && <p>Nu s-au gasit studenti inregistrati pentru aceasta facultate.</p>
            )}
        </div>
    );
};

export default DashboardFaculty;