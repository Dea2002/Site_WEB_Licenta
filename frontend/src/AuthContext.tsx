// frontend/src/AuthContext.tsx
import React, { createContext, useState, useEffect } from "react";
import jwt_decode from "jwt-decode";
import axios from "axios";

export interface User {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    role: "student" | "proprietar" | "facultate" | "admin";
    faculty?: string;
    faculty_valid?: boolean;
    medie_valid?: string;  // observă: string ISO
    medie?: string | null;
    iat: number;
    exp: number;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    setUser: (user: User | null) => void;
    login: (token: string, decoded: User) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    token: null,
    setUser: () => { },
    login: () => { },
    logout: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // interceptor Axios
    useEffect(() => {
        const i = axios.interceptors.request.use((config) => {
            if (token) config.headers!["Authorization"] = `Bearer ${token}`;
            return config;
        });
        return () => axios.interceptors.request.eject(i);
    }, [token]);

    // preia token de pe localStorage
    useEffect(() => {
        const t = localStorage.getItem("token");
        if (t) {
            const decoded = jwt_decode<User>(t);
            setToken(t);
            setUser(decoded);
            setIsAuthenticated(true);
        }
    }, []);

    const login = (newToken: string, decoded: User) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(decoded);
        setIsAuthenticated(true);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, user, token, setUser, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};
