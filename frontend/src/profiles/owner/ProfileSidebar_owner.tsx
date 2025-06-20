import React from 'react';
import './profile_owner.css';

type ProfileSection = 'edit';

interface ProfileSidebarProps {
    activeSection: ProfileSection;
    onSectionChange: (section: ProfileSection) => void;
    onInitiateDeleteAccount: () => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeSection, onSectionChange, onInitiateDeleteAccount }) => {
    const menuItems = [
        { id: 'edit', label: 'Editare Profil' },
    ];

    const handleDeleteClick = () => {
        if (window.confirm("ATENTIE! Esti pe cale sa iti stergi contul de proprietar. Aceasta actiune va duce la stergerea tuturor apartamentelor listate si anularea chiriilor asociate. Actiunea este ireversibila. Continui?")) {
            if (window.confirm("Confirmare finala: Sigur doresti sa stergi contul de proprietar si toate datele asociate?")) {
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
                            className={`sidebar-button ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => onSectionChange(item.id as ProfileSection)}
                        >
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="sidebar-actions-dangerous">
                <button
                    className="sidebar-button delete-account-button"
                    onClick={handleDeleteClick}
                >
                    Sterge Contul Proprietar
                </button>
            </div>

        </nav>
    );
};

export default ProfileSidebar;