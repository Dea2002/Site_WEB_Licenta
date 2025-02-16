// frontend/src/LoginModal.tsx
import React from 'react';
import Login from './Login';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="close-button">X</button>
                <Login />
            </div>
        </div>
    );
};

export default LoginModal;
