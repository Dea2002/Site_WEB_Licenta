import React from 'react';
import './profile_student.css';

type ProfileSection = 'edit' | 'current-rent' | 'history';

interface ProfileSidebarProps {
    activeSection: ProfileSection;
    onSectionChange: (section: ProfileSection) => void;
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