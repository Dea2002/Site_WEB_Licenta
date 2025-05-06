// frontend/src/Register.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Bara_navigatie from "./NavBars/Bara_navigatie";
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
    numar_matricol: string;
    anUniversitar: string;
    medie: string;
}

interface FacultyFormState {
    fullName: string;
    abreviere: string;
    logo: File | null; // Store the File object
    documentOficial: File | null; // Store the File object
    numeRector: string;
    emailSecretariat: string;
    phoneNumber: string;
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

interface FacultyInfo {
    _id?: string; // Optional, but good practice if backend sends it
    fullName: string;
    abreviere: string;
}

// Define possible roles
type Role = "student" | "proprietar" | "facultate" | null;

const getYearOptionsForFaculty = (facultyName: string): string[] => {
    // Normalize the faculty name slightly for easier comparison (lowercase)
    const lowerCaseFaculty = facultyName.toLowerCase();
    if (lowerCaseFaculty.includes("universitatea politehnica timisoara")) {
        return ["1", "2", "3", "4"];
    } else if (lowerCaseFaculty.includes("medicina victor babes timisoara")) {
        return ["1", "2", "3", "4", "5", "6"];
    } else if (lowerCaseFaculty.includes("universitatea de vest")) {
        return ["1", "2", "3"];
    } else return [""];
};

const Register: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();
    const [facultiesList, setFacultiesList] = useState<FacultyInfo[]>([]);

    // State for Student form
    const [formState, setFormState] = useState<RegisterFormState>({
        email: "",
        fullName: "",
        phoneNumber: "",
        gender: "",
        password: "",
        confirmPassword: "",
        faculty: "",
        numar_matricol: "",
        anUniversitar: "",
        medie: "",
    });

    const [facultyFormState, setFacultyFormState] = useState<FacultyFormState>({
        fullName: "",
        abreviere: "",
        logo: null,
        documentOficial: null,
        numeRector: "",
        emailSecretariat: "",
        phoneNumber: "",
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

    useEffect(() => {
        const fetchFaculties = async () => {
            try {
                // Asigura-te ca URL-ul este corect (poate ai un base URL in axios config)
                const response = await axios.get<FacultyInfo[]>("http://localhost:5000/faculty");
                // Presupunand ca backend-ul returneaza direct array-ul [{fullName: '...', abreviere: '...'}, ...]
                setFacultiesList(response.data);
            } catch (err) {
                console.error("Eroare la fetch facultati:", err);
            }
        };

        fetchFaculties();
    }, []); // [] asigura rularea o singura data la montare

    // Change handler for Student form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));

        if (name === "faculty") {
            setFormState((prevState) => ({
                ...prevState,
                anUniversitar: "", // Reset year selection
            }));
        }

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
                () => { },
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
        setError("");
        setSuccess("");
        const {
            email,
            fullName,
            phoneNumber,
            gender,
            password,
            confirmPassword,
            faculty,
            numar_matricol,
            anUniversitar,
            medie,
        } = formState;

        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }
        if (
            !email ||
            !fullName ||
            !phoneNumber ||
            !gender ||
            !faculty ||
            !anUniversitar ||
            !medie
        ) {
            setError("Toate campurile sunt obligatorii pentru studenti");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie sa aiba cel putin 6 caractere");
            return;
        }

        const medieValue = parseFloat(medie); // Convert input string to number
        let medieRange = ""; // Initialize range string

        if (isNaN(medieValue) || medieValue < 5 || medieValue > 10) {
            setError("Media introdusa nu este valida (trebuie sa fie intre 5.00 si 10.00).");
            return;
        }

        // Define your ranges (adjust these as needed)
        if (medieValue >= 9.5) {
            medieRange = "Categoria 1: (9.50 - 10.00)";
        } else if (medieValue >= 9.0) {
            medieRange = "Categoria 2: (9.00 - 9.49)";
        } else if (medieValue >= 8.5) {
            medieRange = "Categoria 3: (8.50 - 8.99)";
        } else if (medieValue >= 5.0) {
            medieRange = "Categoria 4: (5.00 - 8.49)";
        }

        try {
            await axios.post("http://localhost:5000/auth/register_student", {
                email,
                fullName,
                phoneNumber,
                gender,
                password,
                faculty,
                numar_matricol,
                anUniversitar,
                medie: medieRange,
                role: "student",
            });
            setSuccess("Inregistrare reusita! Vei fi redirectionat catre pagina de login.");
            setFormState({
                email: "",
                fullName: "",
                phoneNumber: "",
                gender: "",
                password: "",
                confirmPassword: "",
                faculty: "",
                numar_matricol: "",
                anUniversitar: "",
                medie: "",
            });
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la inregistrare. Emailul ar putea fi deja folosit.");
            }
        }
    };

    // --- START: Submit handler for Faculty form ---
    const handleFacultySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const {
            fullName,
            abreviere,
            logo,
            documentOficial,
            numeRector,
            emailSecretariat,
            phoneNumber,
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
            !fullName ||
            !abreviere ||
            !logo ||
            !documentOficial ||
            !numeRector ||
            !emailSecretariat ||
            !phoneNumber ||
            !password
        ) {
            setError("Toate campurile marcate cu * sunt obligatorii");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie sa aiba cel putin 6 caractere");
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
                fullName,
                abreviere,
                logoUrl,
                documentUrl,
                numeRector,
                emailSecretariat,
                phoneNumber,
                websiteOficial,
                password,
                role: "facultate",
            });
            setSuccess("inregistrare facultate reusita! Contul va fi verificat.");
            // Reset form state
            setFacultyFormState({
                fullName: "",
                abreviere: "",
                logo: null,
                documentOficial: null,
                numeRector: "",
                emailSecretariat: "",
                phoneNumber: "",
                websiteOficial: "",
                password: "",
                confirmPassword: "",
            });

            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la inregistrarea facultatii. incercati din nou.");
            }
            console.error("Faculty Registration Error:", err);
        } finally {
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
            setError("Toate campurile marcate cu * sunt obligatorii");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie sa aiba cel putin 6 caractere");
            return;
        }

        try {
            await axios.post("http://localhost:5000/auth/register_owner", {
                email,
                fullName,
                password,
                role: "proprietar",
            });
            setSuccess("inregistrare proprietar reusita! Veti fi redirectionat.");

            setOwnerFormState({ email: "", fullName: "", password: "", confirmPassword: "" });
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError(
                    "Eroare la inregistrarea proprietarului. Emailul ar putea fi deja folosit.",
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
            const currentYearOptions = getYearOptionsForFaculty(formState.faculty);

            return (
                <div className="register-container student-form">
                    <h1>Inregistrare Student</h1>
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
                            <label>Numar de telefon:*</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formState.phoneNumber}
                                onChange={handleChange}
                                required
                                pattern="[0-9]{10}"
                                title="Introduceti un numar de telefon valid (10 cifre)"
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
                                <option value="">Selecteaza genul</option>
                                <option value="male">Masculin</option>
                                <option value="female">Feminin</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="facultySelect">Facultatea:*</label>
                            <select
                                id="facultySelect"
                                name="faculty"
                                value={formState.faculty}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>
                                    {" "}
                                    -- Selecteaza facultatea --{" "}
                                </option>
                                {facultiesList.map((faculty) => (
                                    <option
                                        key={faculty.abreviere || faculty.fullName}
                                        value={faculty.fullName}
                                    >
                                        {faculty.fullName} ({faculty.abreviere}){" "}
                                        {/* afiseaza numele si abrevierea */}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Numar matricol:</label>
                            <input
                                type="text"
                                name="numar_matricol"
                                value={formState.numar_matricol}
                                onChange={handleChange}
                                required={formState.anUniversitar !== "1"}
                            />
                        </div>

                        <div>
                            <label htmlFor="anUniversitar">Anul universitar:*</label>
                            <select
                                id="anUniversitar"
                                name="anUniversitar"
                                value={formState.anUniversitar} // Use the state value
                                onChange={handleChange}
                                required
                                // Disable if no faculty is selected OR if options are empty
                                disabled={!formState.faculty || currentYearOptions.length === 0}
                            >
                                <option value="" disabled>
                                    -- Selecteaza anul --
                                </option>
                                {currentYearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {`Anul ${year}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {/* Use conditional rendering for the label text */}
                            <label htmlFor="medie">
                                {formState.anUniversitar === "1" ? "Medie admitere:*" : "Media:*"}
                            </label>
                            <input
                                type="number"
                                id="medie"
                                name="medie"
                                value={formState.medie}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="5"
                                max="10"
                                placeholder="Ex: 8.75"
                                title="Introduceti media (intre 5.00 si 10.00)"
                            />
                            <small>Media exacta nu va fi afisata, ci doar intervalul.</small>
                        </div>

                        <div>
                            <label>Parola:*</label>
                            <input
                                type="password"
                                name="password"
                                value={formState.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                title="Parola trebuie sa aiba cel putin 6 caractere"
                            />
                        </div>
                        <div>
                            <label>Confirma Parola:*</label>
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
                        <button type="submit">inregistreaza-te ca Student</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            inapoi
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
                    <h1>inregistrare Proprietar</h1>
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
                            <label htmlFor="ownerPassword">Parola:*</label>
                            <input
                                type="password"
                                id="ownerPassword"
                                name="password"
                                value={ownerFormState.password}
                                onChange={handleOwnerChange}
                                required
                                minLength={6}
                                title="Parola trebuie sa aiba cel putin 6 caractere"
                            />
                        </div>
                        <div>
                            <label htmlFor="ownerConfirmPassword">Confirma Parola:*</label>
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
                        <button type="submit">inregistreaza-te ca Proprietar</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            inapoi la selectia rolului
                        </button>
                    </form>
                </div>
            );
        }

        // --- START: JSX for Faculty Form ---
        if (selectedRole === "facultate") {
            return (
                <div className="register-container faculty-form">
                    <h1>inregistrare Facultate</h1>
                    <form onSubmit={handleFacultySubmit} className="register-form">
                        <div>
                            <label htmlFor="fullName">Denumirea completa:*</label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={facultyFormState.fullName}
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
                                Atasati un document oficial (PDF, DOC, imagine) care atesta statutul
                                institutiei.
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
                            <label htmlFor="phoneNumber">Telefon Secretariat:*</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={facultyFormState.phoneNumber}
                                onChange={handleFacultyChange}
                                required
                                pattern="[0-9]{10}"
                                title="Introduceti un numar de telefon valid (10 cifre)"
                            />
                        </div>
                        <div>
                            <label htmlFor="websiteOficial">Website Oficial (optional):</label>
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
                            <label htmlFor="facPassword">Parola:*</label>
                            <input
                                type="password"
                                id="facPassword"
                                name="password"
                                value={facultyFormState.password}
                                onChange={handleFacultyChange}
                                required
                                minLength={6}
                                title="Parola trebuie sa aiba cel putin 6 caractere"
                            />
                        </div>
                        <div>
                            <label htmlFor="facConfirmPassword">Confirma Parola:*</label>
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
                        <button type="submit">inregistreaza Facultate</button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            inapoi
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
                            Autentifica-te
                        </Link>
                    </p>
                )}
            </div>
        </>
    );
};

export default Register;
