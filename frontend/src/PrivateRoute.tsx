import React from "react";
import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { User, Faculty } from "./AuthContext";

interface Props {
    allowedRoles?: User["role"][];
}

// Daca nu esti logat => login.
// Daca ai rol, dar nu esti in allowedRoles => /unauthorized (sau alta pagina).
// Altfel, afiseaza ruta copil cu <Outlet/>.
export const PrivateRoute: React.FC<Props> = ({ allowedRoles }) => {
    const { isAuthenticated, user, faculty } = useContext(AuthContext);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (faculty) {
        if (allowedRoles && !allowedRoles.includes(faculty.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    } else
        if (allowedRoles && !allowedRoles.includes(user!.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    return <Outlet />;
};


export default PrivateRoute;
