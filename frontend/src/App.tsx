// frontend/src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Home from "./Home";
import ApartmentDetails from "./ApartmentDetails";
import Reservation from "./Reservation";
import Confirmation from "./Confirmation";
import PrivateRoute from "./PrivateRoute";
import Login from "./Login";
import Register from "./Register";
import { AuthProvider } from "./AuthContext";
import DashboardAdmin from "./DashboardAdmin";
import UserListAdmin from "./UserListAdmin";
import ApartmentsListAdmin from "./ApartmentsListAdmin";
import OwnersListAdmin from "./OwnersListAdmin";
import AdminRoute from "./AdminRoute";
import Bara_navigatie from "./Bara_navigatie";
import "bootstrap/dist/css/bootstrap.min.css";
import Profile from "./Profile";

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Routes>
                {/* LandingPage la ruta de baza */}
                <Route path="/" element={<LandingPage />} />
                {/* Pagina Home cu oferte */}
                <Route path="/home" element={<Home />} />
                <Route path="/apartment/:id" element={<ApartmentDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/reservation"
                    element={
                        <PrivateRoute>
                            <Reservation />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/confirmation"
                    element={
                        <PrivateRoute>
                            <Confirmation />
                        </PrivateRoute>
                    }
                />
                <Route path="/profile" element={<Profile />} />
                <Route element={<AdminRoute />}>
                    <Route path="/admin/dashboard" element={<DashboardAdmin />} />
                    <Route path="/admin/users" element={<UserListAdmin />} />
                    <Route path="/admin/apartments" element={<ApartmentsListAdmin />} />
                    <Route path="/admin/owners" element={<OwnersListAdmin />} />
                </Route>
            </Routes>
        </AuthProvider>
    );
};

export default App;
