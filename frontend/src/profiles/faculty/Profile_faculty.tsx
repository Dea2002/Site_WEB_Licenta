import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_faculty.css";
import { useNavigate } from "react-router-dom";
import EditProfile from './EditProfile_faculty';
import ProfileSidebar from './ProfileSidebar_faculty';
import { api } from '../../api';

type ProfileSection = 'edit';

const Profile_faculty: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit');
    const { faculty, token, logout } = useContext(AuthContext);

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

        const studentsInvalidated = await invalidateAllStudentsAssociated();

        if (studentsInvalidated) {
            const accountDeleted = await deleteFacultyAccountAPI();
            if (accountDeleted) {
                alert("Contul facultatii a fost sters cu succes. Veti fi deconectat.");
                logout();
                navigate('/');
            }
        }
    };

    return (
        <>
            <div className="user-profile-page-container">
                <div className="profile-content-box">
                    <div className="profile-sidebar-column">
                        <ProfileSidebar
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                            onInitiateDeleteAccount={handleInitiateDeleteAccount}
                        />
                    </div>

                    <div className="profile-main-content-column">
                        {renderSection()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile_faculty;