import React, { useContext } from "react";
import { AuthContext } from "../AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import Bara_navigatie_facultate from "./Bara_navigatie_facultate";
import { useLocation } from "react-router-dom";

const NavSelector: React.FC = () => {
    const { isAuthenticated, user } = useContext(AuthContext);
    const { pathname } = useLocation();

    if (pathname === "/") return null;
    // Daca nu esti logat, nu afisam niciun navbar (sau unul public)
    if (!isAuthenticated) return <Bara_navigatie />;

    // Alege in functie de role
    switch (user?.role) {
        case "student":
            return <Bara_navigatie />;
        case "proprietar":
            return <Bara_nav_OwnerDashboard />;
        default:
            // orice altceva (inclusiv undefined) le tratam ca “facultate”
            return <Bara_navigatie_facultate />;
    }
};

export default NavSelector;