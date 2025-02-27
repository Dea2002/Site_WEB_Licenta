import React, { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import jwt_decode from "jwt-decode";

const AdminRoute: React.FC = () => {
    const { token } = useContext(AuthContext);

    if (!token) {
        return <Navigate to="/login" />;
    }

    const decodedToken: any = jwt_decode(token);
    if (decodedToken.role !== "admin") {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};

export default AdminRoute;
