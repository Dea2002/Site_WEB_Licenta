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
                return <EditProfile faculty={faculty} />;
            default:
                return <EditProfile faculty={faculty} />;
        }
    };

    // Functia care invalideaza toti studentii
    const invalidateAllStudentsAssociated = async (): Promise<boolean> => {
        if (!token) {
            console.error("Token sau ID facultate lipseste pentru invalidarea studentilor.");
            return false;
        }
        try {
            await api.patch('/faculty/students/invalidate-all');
            return true;
        } catch (err: any) {
            console.error("Eroare la invalidarea tuturor studentilor:", err);
            return false;
        }
    };

    // Functia care sterge contul facultatii
    const deleteFacultyAccountAPI = async () => {
        if (!token) {
            console.error("Token sau ID facultate lipseste pentru stergerea contului.");
            return false;
        }
        try {
            await api.delete(`/faculty/account/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (err: any) {
            console.error("Eroare la stergerea contului facultatii din API:", err);
            return false;
        }
    };


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