import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
// import axios from "axios";
import "./profile_student.css";
// import { parseISO, format, isAfter } from "date-fns";
// import { useNavigate } from "react-router-dom";
import Bara_navigatie from "../../Bara_navigatie"; // Your Navbar component
import EditProfile from './EditProfile';
import CurrentRent from './CurrentRent';
import RentHistory from './RentHistory';
import ProfileSidebar from './ProfileSidebar';

// Definește tipurile posibile pentru secțiunea activă
type ProfileSection = 'edit' | 'current-rent' | 'history';

const UserProfilePage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { user } = useContext(AuthContext); // Preluăm user-ul din context

    // Dacă nu există user logat, poate redirecționăm sau afișăm un mesaj
    if (!user) {
        // Poți adăuga o redirecționare sau un placeholder aici
        return (
            <>
                <Bara_navigatie />
                <div className="user-profile-container">
                    <p>Trebuie să fii autentificat pentru a vedea această pagină.</p>
                </div>
            </>
        );
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile user={user} />; // Trimitem user-ul către componentă
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
            <Bara_navigatie />
            <div className="user-profile-page-container">
                {/* Acest div reprezintă "dreptunghiul mare" */}
                <div className="profile-content-box">
                    {/* Coloana din stânga (Sidebar) */}
                    <div className="profile-sidebar-column">
                        <ProfileSidebar
                            activeSection={activeSection}
                            onSectionChange={setActiveSection} // Trimitem funcția de actualizare
                        />
                    </div>

                    {/* Coloana din dreapta (Conținutul dinamic) */}
                    <div className="profile-main-content-column">
                        {renderSection()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserProfilePage;