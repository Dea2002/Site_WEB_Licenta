import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_faculty.css";
import EditProfile from './EditProfile_faculty';
import ProfileSidebar from './ProfileSidebar_faculty';

// Defineste tipurile posibile pentru sectiunea activă
type ProfileSection = 'edit';

const Profile_faculty: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { faculty } = useContext(AuthContext); // Preluăm user-ul din context
    if (!faculty) {
        return <p>Trebuie să fii autentificat pentru a vedea această pagină.</p>;
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile faculty={faculty} />; // Trimitem user-ul către componentă
            default:
                return <EditProfile faculty={faculty} />; // Sau un mesaj default
        }
    };

    return (
        <>
            <div className="user-profile-page-container">
                {/* Acest div reprezintă "dreptunghiul mare" */}
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

export default Profile_faculty;