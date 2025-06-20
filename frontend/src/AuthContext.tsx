import React, { createContext, useState, useEffect } from "react";
import jwt_decode from "jwt-decode";
import { api } from './api';

export interface User {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    role: "student" | "proprietar" | "facultate" | "admin";
    faculty?: string;
    faculty_valid?: boolean;
    numar_matricol?: string;
    anUniversitar?: string;
    medie_valid?: string;
    medie?: string;
    iat: number;
    exp: number;
}

export interface Faculty {
    _id: string;
    abreviere: string;
    emailSecretariat: string;
    fullName: string;
    medie_valid: string;
    numeRector: string;
    phoneNumber: string;
    logoUrl: string;
    role: "facultate";
}

interface AuthContextType {
    isAuthenticated: boolean;
    user?: User | null;
    faculty?: Faculty | null;
    token: string | null;
    setUser: (user: User | null) => void;
    setFaculty: (user: Faculty | null) => void;
    login: (token: string, decoded: User) => void;
    loginFaculty: (token: string, decoded: Faculty) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    token: null,
    setUser: () => { },
    setFaculty: () => { },
    login: () => { },
    loginFaculty: () => { },
    logout: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem("token");
    });
    const [user, setUser] = useState<User | null>(() => {
        const t = localStorage.getItem("token");
        return t ? jwt_decode<User>(t) : null;
    });

    const [faculty, setFaculty] = useState<Faculty | null>(() => {
        const t = localStorage.getItem("token");
        return t ? jwt_decode<Faculty>(t) : null;
    });

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return !!localStorage.getItem("token");
    });

    useEffect(() => {
        if (token) {
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
            delete api.defaults.headers.common["Authorization"];
        }
    }, [token, isAuthenticated]);

    useEffect(() => {
        const t = localStorage.getItem("token");
        if (!t) return;

        const decoded: any = jwt_decode(t);
        setToken(t);
        setIsAuthenticated(true);

        if (decoded.role === "facultate") {
            setFaculty(decoded);
        } else {
            setUser(decoded);
        }
    }, []);

    const login = (newToken: string, decoded: User) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(decoded);
        setFaculty(null);
        setIsAuthenticated(true);
    };

    const loginFaculty = (newToken: string, decoded: Faculty) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setFaculty(decoded);
        setUser(null);
        setIsAuthenticated(true);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setFaculty(null);
        setIsAuthenticated(false);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, user, faculty, token, setUser, setFaculty, login, loginFaculty, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};