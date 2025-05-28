import React, { useContext, useState } from "react";
import { AuthContext } from "../../AuthContext";
import "./profile_owner.css";
import EditProfile from './EditProfile_owner';
import { useNavigate, Link } from "react-router-dom";
import ProfileSidebar from './ProfileSidebar_owner';
import { api } from "../../api"

// Defineste tipurile posibile pentru sectiunea activa
type ProfileSection = 'edit';

const Profile_owner: React.FC = () => {
    const [activeSection, setActiveSection] = useState<ProfileSection>('edit'); // Default: 'edit'
    const { user, token, logout } = useContext(AuthContext); // Preluam user-ul din context
    const navigate = useNavigate();

    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

    const ownerId = user?._id;

    // Functia care gestioneaza apartamentele si chiriile inainte de stergerea contului
    const handlePreparatoryActionsForOwnerDeletion = async (): Promise<boolean> => {
        if (!token || !ownerId) {
            console.error("Token sau ID proprietar lipseste pentru actiunile pregatitoare.");
            setDeleteError("Eroare de autentificare. Reincercati.");
            return false;
        }
        console.log(`Initiere actiuni pregatitoare pentru stergerea contului proprietarului ${ownerId}`);
        setDeleteError(null);
        try {
            // Endpoint-ul tau pentru a anula chirii, sterge/arhiva apartamente, sterge imagini Firebase etc.
            // Backend-ul va prelua ID-ul proprietarului din token.
            // Acest endpoint ar putea returna un status sau un mesaj despre operatiunile efectuate.
            const response = await api.patch('/users/owner_account/prepare-for-deletion');
            console.log("Actiunile pregatitoare pentru stergerea contului proprietarului au fost finalizate:", response.data?.message || "OK");
            return true; // Succes
        } catch (err: any) {
            console.error("Eroare la actiunile pregatitoare pentru stergerea contului proprietarului:", err);
            setDeleteError(err.response?.data?.message || "Nu s-au putut finaliza actiunile pregatitoare (ex: stergerea apartamentelor).");
            return false; // Esec
        }
    };

    // Functia care sterge efectiv contul proprietarului
    const deleteOwnerAccountAPI = async (): Promise<boolean> => {
        if (!token || !ownerId) {
            console.error("Token sau ID proprietar lipseste pentru stergerea contului.");
            setDeleteError("Eroare de autentificare la stergerea contului. Reincercati.");
            return false;
        }
        console.log(`Initiere stergere cont pentru proprietarul ${ownerId}`);
        setDeleteError(null);
        try {
            // Endpoint-ul tau pentru a sterge contul proprietarului
            // Backend-ul va prelua ID-ul proprietarului din token
            await api.delete(`/users/owner_account/delete`);
            console.log("Contul proprietarului a fost sters din baza de date.");
            return true; // Succes
        } catch (err: any) {
            console.error("Eroare la stergerea contului proprietarului din API:", err);
            setDeleteError(err.response?.data?.message || "Nu s-a putut sterge contul proprietarului.");
            return false;
        }
    };

    // Functia care orchestreaza procesul de stergere
    const handleInitiateDeleteAccount = async () => {
        setIsDeletingAccount(true);
        setDeleteError(null);
        setDeleteSuccessMessage(null);

        // Pasul 1: Actiuni pregatitoare (anulare chirii, stergere apartamente etc.)
        const preparatoryActionsCompleted = await handlePreparatoryActionsForOwnerDeletion();
        console.log("Actiuni pregatitoare finalizate:", preparatoryActionsCompleted);
        if (preparatoryActionsCompleted) {
            // Pasul 2: Daca actiunile pregatitoare au reusit, sterge contul proprietarului
            const accountDeleted = await deleteOwnerAccountAPI();
            if (accountDeleted) {
                setDeleteSuccessMessage("Contul de proprietar si toate datele asociate au fost sterse. Veti fi deconectat.");
                alert("Contul de proprietar a fost sters cu succes. Veti fi deconectat.");
                logout();
                navigate('/');
            }
            // Daca deleteOwnerAccountAPI esueaza, deleteError va fi setat in acea functie
        }
        // Daca handlePreparatoryActionsForOwnerDeletion esueaza, deleteError este deja setat.

        setIsDeletingAccount(false);
    };

    if (!user) {
        // Poti adauga o redirectionare sau un placeholder aici
        return (
            <div className="user-profile-page-container">
                <p>Trebuie sa fii autentificat ca proprietar pentru a vedea aceasta pagina. Te rugam <Link to="/login">autentifica-te</Link>.</p>
            </div>
        );
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'edit':
                return <EditProfile user={user} />; // Trimitem user-ul catre componenta
            default:
                return <EditProfile user={user} />; // Sau un mesaj default
        }
    };

    return (
        <div className="user-profile-page-container">
            {/* Acest div reprezinta "dreptunghiul mare" */}
            <div className="profile-content-box">
                {/* Coloana din stanga (Sidebar) */}
                <div className="profile-sidebar-column">
                    <ProfileSidebar
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        onInitiateDeleteAccount={handleInitiateDeleteAccount}
                    />
                </div>

                {/* Coloana din dreapta (Continutul dinamic) */}
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