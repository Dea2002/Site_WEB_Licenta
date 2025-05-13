import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_student.css";
import EditProfile from './EditProfile_student';
import CurrentRent from './CurrentRent_student';
import RentHistory from './RentHistory_student';
import ProfileSidebar from './ProfileSidebar_student';

// Defineste tipurile posibile pentru sectiunea activa
type ProfileSection = 'edit' | 'current-rent' | 'history';

const Profile_student: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { user } = useContext(AuthContext); // Preluam user-ul din context
    console.log(user);
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