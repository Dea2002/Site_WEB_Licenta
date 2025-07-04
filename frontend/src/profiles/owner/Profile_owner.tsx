import React, { useContext, useState } from "react";
import { AuthContext } from "../../authenticate/AuthContext";
import "./profile_owner.css";
import EditProfile from './EditProfile_owner';
import { useNavigate, Link } from "react-router-dom";
import ProfileSidebar from './ProfileSidebar_owner';
import { api } from "../../api"

type ProfileSection = 'edit';

const Profile_owner: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit');
    const { user, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

    const ownerId = user?._id;

    const handlePreparatoryActionsForOwnerDeletion = async (): Promise<boolean> => {
        if (!token || !ownerId) {
            console.error("Token sau ID proprietar lipseste pentru actiunile pregatitoare.");
            setDeleteError("Eroare de autentificare. Reincercati.");
            return false;
        }
        setDeleteError(null);
        try {
            await api.patch('/users/owner_account/prepare-for-deletion');
            return true;
        } catch (err: any) {
            console.error("Eroare la actiunile pregatitoare pentru stergerea contului proprietarului:", err);
            setDeleteError(err.response?.data?.message || "Nu s-au putut finaliza actiunile pregatitoare (ex: stergerea apartamentelor).");
            return false;
        }
    };

    const deleteOwnerAccountAPI = async (): Promise<boolean> => {
        if (!token || !ownerId) {
            console.error("Token sau ID proprietar lipseste pentru stergerea contului.");
            setDeleteError("Eroare de autentificare la stergerea contului. Reincercati.");
            return false;
        }
        setDeleteError(null);
        try {
            await api.delete(`/users/owner_account/delete`);
            return true;
        } catch (err: any) {
            console.error("Eroare la stergerea contului proprietarului din API:", err);
            setDeleteError(err.response?.data?.message || "Nu s-a putut sterge contul proprietarului.");
            return false;
        }
    };

    const handleInitiateDeleteAccount = async () => {
        setIsDeletingAccount(true);
        setDeleteError(null);
        setDeleteSuccessMessage(null);

        const preparatoryActionsCompleted = await handlePreparatoryActionsForOwnerDeletion();
        if (preparatoryActionsCompleted) {
            const accountDeleted = await deleteOwnerAccountAPI();
            if (accountDeleted) {
                setDeleteSuccessMessage("Contul de proprietar si toate datele asociate au fost sterse. Veti fi deconectat.");
                alert("Contul de proprietar a fost sters cu succes. Veti fi deconectat.");
                logout();
                navigate('/');
            }
        }
        setIsDeletingAccount(false);
    };

    if (!user) {
        return (
            <div className="user-profile-page-container">
                <p>Trebuie sa fii autentificat ca proprietar pentru a vedea aceasta pagina. Te rugam <Link to="/login">autentifica-te</Link>.</p>
            </div>
        );
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile user={user} />;
            default:
                return <EditProfile user={user} />;
        }
    };

    return (
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
                    {isDeletingAccount && <p className="loading-message">Se proceseaza stergerea contului si a datelor asociate...</p>}
                    {deleteError && <p className="error-message">{deleteError}</p>}
                    {deleteSuccessMessage && <p className="success-message">{deleteSuccessMessage}</p>}

                    {!isDeletingAccount && !deleteSuccessMessage && renderSection()}
                </div>
            </div>
        </div>
    );
};

export default Profile_owner;