// // frontend/src/AuthContext.tsx
// import React, { createContext, useState, ReactNode, useEffect } from 'react';

// interface AuthContextType {
//     token: string | null;
//     login: (token: string) => void;
//     logout: () => void;
//     isAuthenticated: boolean;
// }

// export const AuthContext = createContext<AuthContextType>({
//     token: null,
//     login: () => { },
//     logout: () => { },
//     isAuthenticated: false,
// });

// export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//     const [token, setToken] = useState<string | null>(null);

//     useEffect(() => {
//         const storedToken = localStorage.getItem('token');
//         if (storedToken) {
//             setToken(storedToken);
//         }
//     }, []);

//     const login = (newToken: string) => {
//         setToken(newToken);
//         localStorage.setItem('token', newToken);
//     };

//     const logout = () => {
//         setToken(null);
//         localStorage.removeItem('token');
//     };

//     return (
//         <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
//             {children}
//         </AuthContext.Provider>
//     );
// };

// frontend/src/AuthContext.tsx

import React, { createContext, useState, useEffect } from "react";
import jwt_decode from "jwt-decode";
import axios from "axios";

interface User {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    role: string;
    faculty: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    setUser: (user: User | null) => void;
    login: (token: string) => void; // Adaugat
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    token: null,
    setUser: () => { },
    login: () => { }, // Adaugat
    logout: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
            const decoded: any = jwt_decode(storedToken);
            setUser({
                _id: decoded.userId,
                fullName: decoded.fullName,
                email: decoded.email,
                phoneNumber: decoded.phoneNumber,
                gender: decoded.gender,
                role: decoded.role,
                faculty: decoded.faculty,
            });
        }
    }, []);

    const login = (token: string) => {
        localStorage.setItem("token", token);
        setToken(token);
        setIsAuthenticated(true);
        const decoded: any = jwt_decode(token);
        setUser({
            _id: decoded.userId,
            fullName: decoded.fullName,
            email: decoded.email,
            phoneNumber: decoded.phoneNumber,
            gender: decoded.gender,
            role: decoded.role,
            faculty: decoded.faculty,
        });
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, setUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
