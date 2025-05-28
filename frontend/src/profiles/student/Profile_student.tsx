import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_student.css";
import { api } from "../../api";
import { useNavigate } from "react-router-dom";
import EditProfile from './EditProfile_student';
import CurrentRent from './CurrentRent_student';
import RentHistory from './RentHistory_student';
import ProfileSidebar from './ProfileSidebar_student';

// Defineste tipurile posibile pentru sectiunea activa
type ProfileSection = 'edit' | 'current-rent' | 'history';

const Profile_student: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { user, logout, token } = useContext(AuthContext); // Preluam user-ul din context
    const navigate = useNavigate();

    // Daca nu exista user logat, poate redirectionam sau afisam un mesaj
    if (!user) {
        // Poti adauga o redirectionare sau un placeholder aici
        return (
            <>
                <div className="user-profile-container">
                    <p>Trebuie sa fii autentificat pentru a vedea aceasta pagina.</p>
                </div>
            </>
        );
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile user={user} />; // Trimitem user-ul catre componenta
            case 'current-rent':
                return <CurrentRent userId={user._id} />; // Trimitem ID-ul pentru fetch
            case 'history':
                return <RentHistory userId={user._id} />; // Trimitem ID-ul pentru fetch
            default:
                return <EditProfile user={user} />; // Sau un mesaj default
        }
    };

    const studentId = user?._id;

    const cancelAllActiveStudentRequests = async (): Promise<boolean> => {
        if (!token || !studentId) {
            console.error("Token sau ID student lipseste pentru anularea cererilor.");

            return false;
        }

        try {
            await api.patch('/users/requests/cancel-all-for-student', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (err: any) {
            console.error("Eroare la anularea cererilor studentului:", err);

            return false;
        }
    };

    // Functia care sterge contul studentului
    const deleteStudentAccountAPI = async (): Promise<boolean> => {
        if (!token || !studentId) {
            console.error("Token sau ID student lipseste pentru stergerea contului.");

            return false;
        }

        try {
            // Endpoint-ul tau pentru a sterge contul studentului
            // Backend-ul va prelua ID-ul studentului din token
            await api.delete(`/users/account/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (err: any) {
            console.error("Eroare la stergerea contului studentului din API:", err);

            return false;
        }
    };

    // Functia care orchestreaza procesul de stergere
    const handleInitiateDeleteAccount = async () => {

        // Pasul 1: Anuleaza toate cererile active/pending
        const requestsCanceled = await cancelAllActiveStudentRequests();

        if (requestsCanceled) {
            // Pasul 2: Daca cererile au fost anulate cu succes, sterge contul studentului
            const accountDeleted = await deleteStudentAccountAPI();
            if (accountDeleted) {
                alert("Contul a fost sters cu succes. Veti fi deconectat.");
                logout();
                navigate('/');
            }
        }
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

export default Profile_student;