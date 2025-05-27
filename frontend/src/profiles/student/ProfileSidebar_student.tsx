import React from 'react';
import './profile_student.css'; // Refolosim CSS sau cream unul dedicat

// Tipuri definite in parinte
type ProfileSection = 'edit' | 'current-rent' | 'history';

interface ProfileSidebarProps {
    activeSection: ProfileSection;
    onSectionChange: (section: ProfileSection) => void; // Functie callback
    onInitiateDeleteAccount: () => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeSection, onSectionChange, onInitiateDeleteAccount }) => {
    const menuItems = [
        { id: 'edit', label: 'Editare Profil' },
        { id: 'current-rent', label: 'Vezi Chiria Actuala' },
        { id: 'history', label: 'Istoric Chirii' },
    ];

    const handleDeleteClick = () => {
        if (window.confirm("ATENTIE! Esti pe cale sa iti stergi contul. Aceasta actiune va anula toate cererile de chirie active si este ireversibila. Continui?")) {
            if (window.confirm("Confirmare finala: Sigur doresti sa stergi contul?")) {
                onInitiateDeleteAccount();
            }
        }
    };
    return (
        <nav className="profile-sidebar-nav">
            <ul>
                {menuItems.map((item) => (
                    <li key={item.id}>
                        <button
                            // Aplicam clasa 'active' daca ID-ul itemului corespunde sectiunii active
                            className={`sidebar-button ${activeSection === item.id ? 'active' : ''}`}
                            // La click, apelam functia din parinte cu ID-ul sectiunii
                            onClick={() => onSectionChange(item.id as ProfileSection)}
                        >
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
            {/* NOU: Sectiune pentru stergerea contului */}
            <div className="sidebar-actions-dangerous">
                <button
                    className="sidebar-button delete-account-button" // Foloseste aceeasi clasa sau una noua
                    onClick={handleDeleteClick}
                >
                    Sterge Contul
                </button>
            </div>
        </nav>
    );
};

export default ProfileSidebar;