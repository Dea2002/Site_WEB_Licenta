import React from 'react';
import './profile_student.css'; // Refolosim CSS sau creăm unul dedicat

// Tipuri definite în părinte
type ProfileSection = 'edit' | 'current-rent' | 'history';

interface ProfileSidebarProps {
    activeSection: ProfileSection;
    onSectionChange: (section: ProfileSection) => void; // Funcție callback
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeSection, onSectionChange }) => {
    const menuItems = [
        { id: 'edit', label: 'Editare Profil' },
        { id: 'current-rent', label: 'Vezi Chiria Actuală' },
        { id: 'history', label: 'Istoric Chirii' },
    ];

    return (
        <nav className="profile-sidebar-nav">
            <ul>
                {menuItems.map((item) => (
                    <li key={item.id}>
                        <button
                            // Aplicăm clasa 'active' dacă ID-ul itemului corespunde secțiunii active
                            className={`sidebar-button ${activeSection === item.id ? 'active' : ''}`}
                            // La click, apelăm funcția din părinte cu ID-ul secțiunii
                            onClick={() => onSectionChange(item.id as ProfileSection)}
                        >
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default ProfileSidebar;