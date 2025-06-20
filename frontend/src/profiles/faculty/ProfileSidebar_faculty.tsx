import React from 'react';
import './profile_faculty.css';

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
        if (window.confirm("ATENTIE! Sunteti pe cale sa initiati procesul de stergere a contului facultatii. Aceasta actiune va invalida toti studentii asociati si este ireversibila. Continuati?")) {
            if (window.confirm("Confirmare finala: Sigur doriti sa stergeti contul facultatii?")) {
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
                    Sterge Contul Facultatii
                </button>
            </div>
        </nav>
    );
};

export default ProfileSidebar;