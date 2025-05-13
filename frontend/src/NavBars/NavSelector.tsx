import React, { useContext } from "react";
import { AuthContext } from "../AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import Bara_navigatie_facultate from "./Bara_navigatie_facultate";

const NavSelector: React.FC = () => {
    const { isAuthenticated, user } = useContext(AuthContext);

    // Dacă nu esti logat, nu afisăm niciun navbar (sau unul public)
    if (!isAuthenticated) return null;

    // Alege in functie de role
    switch (user?.role) {
        case "student":
            return <Bara_navigatie />;
        case "proprietar":
            return <Bara_nav_OwnerDashboard />;
        default:
            // orice altceva (inclusiv undefined) le tratăm ca “facultate”
            return <Bara_navigatie_facultate />;
    }
};

export default NavSelector;