import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_faculty.css";
import { useNavigate } from "react-router-dom";
import EditProfile from './EditProfile_faculty';
import ProfileSidebar from './ProfileSidebar_faculty';
import { api } from '../../api';

// Defineste tipurile posibile pentru sectiunea activa
type ProfileSection = 'edit';

const Profile_faculty: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { faculty, token, logout } = useContext(AuthContext); // Preluam user-ul din context

    const navigate = useNavigate();

    if (!faculty) {
        return <p>Trebuie sa fii autentificat pentru a vedea aceasta pagina.</p>;
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile faculty={faculty} />; // Trimitem user-ul catre componenta
            default:
                return <EditProfile faculty={faculty} />; // Sau un mesaj default
        }
    };

    // Functia care invalideaza toti studentii
    const invalidateAllStudentsAssociated = async (): Promise<boolean> => {
        if (!token) {
            console.error("Token sau ID facultate lipseste pentru invalidarea studentilor.");
            return false;
        }
        console.log(`Initiere invalidare studenti pentru facultatea ${faculty._id}`);
        try {
            // Endpoint-ul tau pentru a invalida toti studentii unei facultati
            // Backend-ul va prelua ID-ul facultatii din token-ul utilizatorului logat (care este facultatea)
            await api.patch('/faculty/students/invalidate-all');
            console.log("Toti studentii asociati au fost invalidati.");
            return true; // Succes
        } catch (err: any) {
            console.error("Eroare la invalidarea tuturor studentilor:", err);
            return false; // Ese
        }
    };

    // Functia care sterge contul facultatii
    const deleteFacultyAccountAPI = async () => { // Renumit pentru a evita confuzia cu functia de mai jos
        if (!token) {
            console.error("Token sau ID facultate lipseste pentru stergerea contului.");
            return false; // Indica esec
        }
        console.log(`Initiere stergere cont pentru facultatea ${faculty._id}`);
        try {
            await api.delete(`/faculty/account/delete`, { // Backend-ul preia ID-ul din token
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Contul facultatii a fost sters din baza de date.");
            return true; // Succes
        } catch (err: any) {
            console.error("Eroare la stergerea contului facultatii din API:", err);
            return false; // Ese
        }
    };

    // Functia care orchestreaza procesul de stergere, pasata la Sidebar
    const handleInitiateDeleteAccount = async () => {

        // Pasul 1: Invalideaza toti studentii
        const studentsInvalidated = await invalidateAllStudentsAssociated();

        if (studentsInvalidated) {
            // Pasul 2: Daca studentii au fost invalidati cu succes, sterge contul facultatii
            const accountDeleted = await deleteFacultyAccountAPI();
            if (accountDeleted) {
                alert("Contul facultatii a fost sters cu succes. Veti fi deconectat.");
                logout();
                navigate('/');
            }
            // Daca deleteFacultyAccountAPI esueaza, deleteError va fi setat in acea functie
        }
        // Daca invalidateAllStudentsAssociated esueaza, deleteError este deja setat.

    };


    return (
        <>
            <div className="user-profile-page-container">
                {/* Acest div reprezinta "dreptunghiul mare" */}
                <div className="profile-content-box">
                    {/* Coloana din stanga (Sidebar) */}
                    <div className="profile-sidebar-column">
                        <ProfileSidebar
                            activeSection={activeSection}
                            onSectionChange={setActiveSection} // Trimitem functia de actualizare
                            onInitiateDeleteAccount={handleInitiateDeleteAccount}
                        />
                    </div>

                    {/* Coloana din dreapta (Continutul dinamic) */}
                    <div className="profile-main-content-column">
                        {renderSection()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile_faculty;