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
import DashboardFaculty from "./DashboardFaculty";
import UserListAdmin from "./UserListAdmin";
import ApartmentsListAdmin from "./ApartmentsListAdmin";
import OwnersListAdmin from "./OwnersListAdmin";
import AdminRoute from "./AdminRoute";
import DashboardOwner from "./DashboardOwner";
import OwnerApartments from "./OwnerApartments";
import OwnerRequests from "./OwnerRequests";
import ReservationHistory from "./ReservationHistory";
import OwnerListNewApartment from "./CreateAparment";
import FacultyAssociations from './FacultyAssociations';
import FacultyMarks from './FacultyMarks';
// import Bara_navigatie from "./Bara_navigatie";
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

                {/* Ruta pentru dashboard-ul proprietar - disponibila pentru proprietari */}
                <Route path="/owner-dashboard" element={<DashboardOwner />} />

                {/* ruta pentru a putea crea un nou apartament atunci cand esti  */}
                <Route path="/owner-dashboard/list_apartment" element={<OwnerListNewApartment />} />

                {/* Ruta pentru pagina cu lista apartamentelor proprietarului */}
                <Route path="/owner/apartments" element={<OwnerApartments />} />

                {/* Ruta pentru pagina cu lista de cereri de rezervare pentru proprietar */}
                <Route path="/owner/reservation_requests" element={<OwnerRequests />} />

                {/* Ruta pentru pagina cu istoricul rezervarilor pentru proprietar */}
                <Route path="/owner/reservation_history" element={<ReservationHistory />} />

                {/* ruta pentru dashboard-ul facultatii */}
                <Route path="/faculty_dashboard" element={<DashboardFaculty />} />

                {/* ruta pentru cererile de asociere cu facultatea */}
                <Route path="/faculty_dashboard/associations" element={<FacultyAssociations />} />

                {/* ruta pentru cererile de asociere cu facultatea */}
                <Route path="/faculty_dashboard/student_marks" element={<FacultyMarks />} />
            </Routes>
        </AuthProvider>
    );
};

export default App;
