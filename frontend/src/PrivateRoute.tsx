import React from "react";
import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { User, Faculty } from "./AuthContext";

interface Props {
    allowedRoles?: User["role"][];
}

// Dacă nu ești logat => login.
// Dacă ai rol, dar nu ești în allowedRoles => /unauthorized (sau altă pagină).
// Altfel, afișează ruta copil cu <Outlet/>.
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
