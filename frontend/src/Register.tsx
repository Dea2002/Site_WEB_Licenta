// frontend/src/Register.tsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Bara_navigatie from "./Bara_navigatie";
import "./Register.css"; // Ensure CSS is imported

import { storage } from "./firebaseConfig"; // Import Firebase storage if needed
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Interface for Student form
interface RegisterFormState {
    email: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    password: string;
    confirmPassword: string;
    faculty: string; // Specific to student
}

interface FacultyFormState {
    denumireaCompleta: string;
    abreviere: string;
    logo: File | null; // Store the File object
    documentOficial: File | null; // Store the File object
    numeRector: string;
    emailSecretariat: string;
    numarTelefonSecretariat: string;
    websiteOficial: string;
    password: string;
    confirmPassword: string;
}

interface OwnerFormState {
    email: string;
    fullName: string;
    password: string;
    confirmPassword: string;
}

// Define possible roles
type Role = "student" | "proprietar" | "facultate" | null;

const Register: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isUploading, setIsUploading] = useState(false); // Stare pentru a arăta progresul upload-ului
    const [uploadProgress, setUploadProgress] = useState(0); // Stare pentru progresul numeric
    const navigate = useNavigate();

    // State for Student form
    const [formState, setFormState] = useState<RegisterFormState>({
        email: "",
        fullName: "",
        phoneNumber: "",
        gender: "",
        password: "",
        confirmPassword: "",
        faculty: "",
    });

    const [facultyFormState, setFacultyFormState] = useState<FacultyFormState>({
        denumireaCompleta: "",
        abreviere: "",
        logo: null,
        documentOficial: null,
        numeRector: "",
        emailSecretariat: "",
        numarTelefonSecretariat: "",
        websiteOficial: "",
        password: "",
        confirmPassword: "",
    });

    const [ownerFormState, setOwnerFormState] = useState<OwnerFormState>({
        email: "",
        fullName: "",
        password: "",
        confirmPassword: "",
    });

    // Change handler for Student form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        setError("");
    };

    const handleFacultyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, files } = e.target;

        if (type === "file") {
            setFacultyFormState((prevState) => ({
                ...prevState,
                [name]: files ? files[0] : null, // Get the first file selected
            }));
        } else {
            setFacultyFormState((prevState) => ({
                ...prevState,
                [name]: value,
            }));
        }
        setError(""); // Clear errors on change
    };

    const uploadFileToStorage = (file: File, path: String): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject("Fisier invalid");
                return;
            }

            const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    // observa schimbarile de stare, cum ar fi progresul
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress); // ! optional
                    console.log("Upload is" + progress + "% done");
                },
                (error) => {
                    console.error("Upload Error:", error);
                },
                () => {
                    // upload finalizat cu succes, obtine URL pentru download
                    getDownloadURL(uploadTask.snapshot.ref)
                        .then((downloadURL) => {
                            console.log("File available at", downloadURL);
                            resolve(downloadURL); // rezolva promise-ul cu URL-ul
                        })
                        .catch(reject);
                },
            );
        });
    };

    // Submit handler for Student form
    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (keep existing student submit logic) ...
        setError("");
        setSuccess("");
        const { email, fullName, phoneNumber, gender, password, confirmPassword, faculty } =
            formState;

        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }
        if (!email || !fullName || !phoneNumber || !gender || !faculty) {
            setError("Toate câmpurile sunt obligatorii pentru studenți");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie să aibă cel puțin 6 caractere");
            return;
        }

        try {
            await axios.post("http://localhost:5000/auth/register_student", {
                email,
                fullName,
                phoneNumber,
                gender,
                password,
                faculty,
                role: "student",
            });
            setSuccess("Inregistrare reusita! Vei fi redirectionat către pagina de login.");
            setFormState({
                email: "",
                fullName: "",
                phoneNumber: "",
                gender: "",
                password: "",
                confirmPassword: "",
                faculty: "",
            });
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la înregistrare. Emailul ar putea fi deja folosit.");
            }
        }
    };

    // --- START: Submit handler for Faculty form ---
    const handleFacultySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        setIsUploading(true); // incepe upload-ul
        setUploadProgress(0);

        const {
            denumireaCompleta,
            abreviere,
            logo,
            documentOficial,
            numeRector,
            emailSecretariat,
            numarTelefonSecretariat,
            websiteOficial,
            password,
            confirmPassword,
        } = facultyFormState;

        // Client-side Validation
        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }
        if (
            !denumireaCompleta ||
            !logo ||
            !documentOficial ||
            !numeRector ||
            !emailSecretariat ||
            !numarTelefonSecretariat ||
            !password
        ) {
            setError("Toate câmpurile marcate cu * sunt obligatorii");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie să aibă cel puțin 6 caractere");
            return;
        }

        try {
            // 1. Upload Logo
            console.log("Uploading logo");
            const logoUrl = await uploadFileToStorage(logo, `faculty_files/${abreviere}`);

            // 2. Upload Document
            console.log("Uploading document");
            const documentUrl = await uploadFileToStorage(
                documentOficial,
                `faculty_files/${abreviere}`,
            );

            // 3. Send data to backend
            await axios.post("http://localhost:5000/auth/register_faculty", {
                denumireaCompleta,
                abreviere,
                logoUrl,
                documentUrl,
                numeRector,
                emailSecretariat,
                numarTelefonSecretariat,
                websiteOficial,
                password,
                role: "facultate",
            });
            setSuccess("Înregistrare facultate reușită! Contul va fi verificat.");
            // Reset form state
            setFacultyFormState({
                denumireaCompleta: "",
                abreviere: "",
                logo: null,
                documentOficial: null,
                numeRector: "",
                emailSecretariat: "",
                numarTelefonSecretariat: "",
                websiteOficial: "",
                password: "",
                confirmPassword: "",
            });

            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la înregistrarea facultății. Încercați din nou.");
            }
            console.error("Faculty Registration Error:", err);
        } finally {
            setIsUploading(false); // Finalizează starea de upload indiferent de rezultat
            setUploadProgress(0);
        }
    };
    // --- END: Submit handler for Faculty form ---

    const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setOwnerFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        setError(""); // Clear errors on change
    };

    const handleOwnerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const { email, fullName, password, confirmPassword } = ownerFormState;

        // Client-side Validation
        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }
        if (!email || !fullName || !password) {
            setError("Toate câmpurile marcate cu * sunt obligatorii");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie să aibă cel puțin 6 caractere");
            return;
        }

        try {
            await axios.post("http://localhost:5000/auth/register_owner", {
                email,
                fullName,
                password,
                role: "proprietar",
            });
            setSuccess("Înregistrare proprietar reușită! Veți fi redirecționat.");

            setOwnerFormState({ email: "", fullName: "", password: "", confirmPassword: "" });
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError(
                    "Eroare la înregistrarea proprietarului. Emailul ar putea fi deja folosit.",
                );
            }
            console.error("Owner Registration Error:", err);
        }
    };
    // Function to render content based on role
    const renderContent = () => {
        if (!selectedRole) {
            return (
                <div className="role-selection-container">
                    <h2>Alege rolul pentru crearea contului:</h2>
                    <div className="role-buttons">
                        <button
                            className="role-button student"
                            onClick={() => setSelectedRole("student")}
                        >
                            Student
                        </button>
                        <button
                            className="role-button proprietar"
                            onClick={() => setSelectedRole("proprietar")}
                        >
                            Proprietar
                        </button>
                        <button
                            className="role-button facultate"
                            onClick={() => setSelectedRole("facultate")}
                        >
                            Facultate
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedRole === "student") {
            return (
                <div className="register-container student-form">
                    <h1>Înregistrare Student</h1>
                    <form onSubmit={handleStudentSubmit} className="register-form">
                        {/* Student Form Fields... */}
                        <div>
                            <label>Email:*</label>
                            <input
                                type="email"
                                name="email"
                                value={formState.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Nume complet:*</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formState.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Număr de telefon:*</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formState.phoneNumber}
                                onChange={handleChange}
                                required
                                pattern="[0-9]{10}"
                                title="Introduceți un număr de telefon valid (10 cifre)"
                            />
                        </div>
                        <div>
                            <label>Gen:*</label>
                            <select
                                name="gender"
                                value={formState.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selectează genul</option>
                                <option value="male">Masculin</option>
                                <option value="female">Feminin</option>
                            </select>
                        </div>
                        <div>
                            <label>Facultatea:*</label>
                            <input
                                type="text"
                                name="faculty"
                                value={formState.faculty}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Parolă:*</label>
                            <input
                                type="password"
                                name="password"
                                value={formState.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                title="Parola trebuie să aibă cel puțin 6 caractere"
                            />
                        </div>
                        <div>
                            <label>Confirmă Parola:*</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formState.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {error && <p className="error">{error}</p>}
                        {success && <p className="success">{success}</p>}
                        <button type="submit">Înregistrează-te ca Student</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            Înapoi
                        </button>
                    </form>
                </div>
            );
        }

        if (selectedRole === "proprietar") {
            return (
                <div className="register-container owner-form">
                    {" "}
                    {/* Specific class */}
                    <h1>Înregistrare Proprietar</h1>
                    {/* Use owner state and handlers */}
                    <form onSubmit={handleOwnerSubmit} className="register-form">
                        <div>
                            <label htmlFor="ownerEmail">Email:*</label>
                            <input
                                type="email"
                                id="ownerEmail"
                                name="email"
                                value={ownerFormState.email}
                                onChange={handleOwnerChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="ownerFullName">Nume complet:*</label>
                            <input
                                type="text"
                                id="ownerFullName"
                                name="fullName"
                                value={ownerFormState.fullName}
                                onChange={handleOwnerChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="ownerPassword">Parolă:*</label>
                            <input
                                type="password"
                                id="ownerPassword"
                                name="password"
                                value={ownerFormState.password}
                                onChange={handleOwnerChange}
                                required
                                minLength={6}
                                title="Parola trebuie să aibă cel puțin 6 caractere"
                            />
                        </div>
                        <div>
                            <label htmlFor="ownerConfirmPassword">Confirmă Parola:*</label>
                            <input
                                type="password"
                                id="ownerConfirmPassword"
                                name="confirmPassword"
                                value={ownerFormState.confirmPassword}
                                onChange={handleOwnerChange}
                                required
                            />
                        </div>

                        {error && <p className="error">{error}</p>}
                        {success && <p className="success">{success}</p>}
                        <button type="submit">Înregistrează-te ca Proprietar</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            Înapoi la selecția rolului
                        </button>
                    </form>
                </div>
            );
        }

        // --- START: JSX for Faculty Form ---
        if (selectedRole === "facultate") {
            return (
                <div className="register-container faculty-form">
                    <h1>Înregistrare Facultate</h1>
                    <form onSubmit={handleFacultySubmit} className="register-form">
                        <div>
                            <label htmlFor="denumireaCompleta">Denumirea completă:*</label>
                            <input
                                type="text"
                                id="denumireaCompleta"
                                name="denumireaCompleta"
                                value={facultyFormState.denumireaCompleta}
                                onChange={handleFacultyChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="abreviere">Abrevierea facultatii:*</label>
                            <input
                                type="text"
                                id="abreviere"
                                name="abreviere"
                                value={facultyFormState.abreviere}
                                onChange={handleFacultyChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="logo">Logo Facultate:*</label>
                            <input
                                type="file"
                                id="logo"
                                name="logo"
                                onChange={handleFacultyChange}
                                required
                                accept="image/*"
                            />
                            {/* Optional: Preview logo */}
                            {facultyFormState.logo && (
                                <img
                                    src={URL.createObjectURL(facultyFormState.logo)}
                                    alt="Logo Preview"
                                    width="100"
                                    style={{ marginTop: "10px" }}
                                />
                            )}
                        </div>
                        <div>
                            <label htmlFor="documentOficial">Document Oficial Atestare:*</label>
                            <input
                                type="file"
                                id="documentOficial"
                                name="documentOficial"
                                onChange={handleFacultyChange}
                                required
                                accept=".pdf,.doc,.docx,image/*"
                            />
                            <small>
                                Atașați un document oficial (PDF, DOC, imagine) care atestă statutul
                                instituției.
                            </small>
                        </div>
                        <div>
                            <label htmlFor="numeRector">Nume Rector:*</label>
                            <input
                                type="text"
                                id="numeRector"
                                name="numeRector"
                                value={facultyFormState.numeRector}
                                onChange={handleFacultyChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="emailSecretariat">Email Secretariat:*</label>
                            <input
                                type="email"
                                id="emailSecretariat"
                                name="emailSecretariat"
                                value={facultyFormState.emailSecretariat}
                                onChange={handleFacultyChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="numarTelefonSecretariat">Telefon Secretariat:*</label>
                            <input
                                type="tel"
                                id="numarTelefonSecretariat"
                                name="numarTelefonSecretariat"
                                value={facultyFormState.numarTelefonSecretariat}
                                onChange={handleFacultyChange}
                                required
                                pattern="[0-9]{10}"
                                title="Introduceți un număr de telefon valid (10 cifre)"
                            />
                        </div>
                        <div>
                            <label htmlFor="websiteOficial">Website Oficial (opțional):</label>
                            <input
                                type="url"
                                id="websiteOficial"
                                name="websiteOficial"
                                value={facultyFormState.websiteOficial}
                                onChange={handleFacultyChange}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label htmlFor="facPassword">Parolă:*</label>
                            <input
                                type="password"
                                id="facPassword"
                                name="password"
                                value={facultyFormState.password}
                                onChange={handleFacultyChange}
                                required
                                minLength={6}
                                title="Parola trebuie să aibă cel puțin 6 caractere"
                            />
                        </div>
                        <div>
                            <label htmlFor="facConfirmPassword">Confirmă Parola:*</label>
                            <input
                                type="password"
                                id="facConfirmPassword"
                                name="confirmPassword"
                                value={facultyFormState.confirmPassword}
                                onChange={handleFacultyChange}
                                required
                            />
                        </div>

                        {error && <p className="error">{error}</p>}
                        {success && <p className="success">{success}</p>}
                        <button type="submit">Înregistrează Facultate</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            Înapoi
                        </button>
                    </form>
                </div>
            );
        }
        // --- END: JSX for Faculty Form ---

        return null; // Fallback
    };

    return (
        <>
            {" "}
            {/* Use Fragment to avoid unnecessary div */}
            <Bara_navigatie />
            <div className="register-page-container">
                <div key={selectedRole || "selection"} className="content-area">
                    {renderContent()}
                </div>
                {selectedRole && (
                    <p className="login-link-text">
                        Ai deja un cont?{" "}
                        <Link to="/login" className="custom-link">
                            Autentifică-te
                        </Link>
                    </p>
                )}
            </div>
        </>
    );
};

export default Register;
