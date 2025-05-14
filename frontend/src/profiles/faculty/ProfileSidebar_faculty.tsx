import React from 'react';
import './profile_faculty.css'; // Refolosim CSS sau cream unul dedicat

// Tipuri definite in parinte
type ProfileSection = 'edit';

interface ProfileSidebarProps {
    activeSection: ProfileSection;
    onSectionChange: (section: ProfileSection) => void; // Functie callback
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeSection, onSectionChange }) => {
    const menuItems = [
        { id: 'edit', label: 'Editare Profil' },
    ];

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
        </nav>
    );
};

export default ProfileSidebar;