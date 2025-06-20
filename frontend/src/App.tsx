import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Home from "./Home";
import ApartmentDetails from "./ApartmentDetails";
import PrivateRoute from "./PrivateRoute";
import Login from "./Login";
import Register from "./Register";
import { AuthProvider } from "./AuthContext";
import DashboardAdmin from "./DashboardAdmin";
import DashboardFaculty from "./DashboardFaculty";
import UserListAdmin from "./UserListAdmin";
import ApartmentsListAdmin from "./ApartmentsListAdmin";
import OwnersListAdmin from "./OwnersListAdmin";
import DashboardOwner from "./DashboardOwner";
import OwnerApartments from "./OwnerApartments";
import OwnerRequests from "./OwnerRequests";
import ReservationHistory from "./ReservationHistory";
import OwnerListNewApartment from "./CreateAparment";
import FacultyAssociations from './FacultyAssociations';
import FacultyMarks from './FacultyMarks';
import { NotificationsProvider } from './NotificationContext';
import "bootstrap/dist/css/bootstrap.min.css";
import Profile_student from "./profiles/student/Profile_student";
import Profile_owner from "./profiles/owner/Profile_owner";
import Profile_faculty from "./profiles/faculty/Profile_faculty";
import NotificationDashboard from "./NotificationDashboard.tsx";
import NavSelector from "./NavBars/NavSelector.tsx";
import ChatPage from './components/ChatPage';
import ChatHistory from './components/ChatHistory';
import OwnerApartmentDetails from './OwnerApartmentDetails';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <NotificationsProvider>
                <NavSelector />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/apartment/:id" element={<ApartmentDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/notifications" element={<NotificationDashboard />} />
                    <Route path="/chat/:conversationId" element={<ChatPage />} />
                    <Route path="/chat-history" element={<ChatHistory />} />

                    <Route element={<PrivateRoute allowedRoles={["student"]} />}>
                        <Route path="/profile_student" element={<Profile_student />} />
                    </Route>

                    <Route element={<PrivateRoute allowedRoles={["proprietar"]} />}>
                        <Route path="/profile_owner" element={<Profile_owner />} />
                        <Route path="/owner-dashboard" element={<DashboardOwner />} />
                        <Route path="/owner-dashboard/list_apartment" element={<OwnerListNewApartment />} />
                        <Route path="/owner/apartments" element={<OwnerApartments />} />
                        <Route path="/owner/apartments/:apartmentId" element={<OwnerApartmentDetails />} />
                        <Route path="/owner/reservation_requests" element={<OwnerRequests />} />
                        <Route path="/owner/reservation_history" element={<ReservationHistory />} />
                    </Route>

                    <Route element={<PrivateRoute allowedRoles={["facultate"]} />}>
                        <Route path="/profile_faculty" element={<Profile_faculty />} />
                        <Route path="/faculty_dashboard" element={<DashboardFaculty />} />
                        <Route path="/faculty_dashboard/associations" element={<FacultyAssociations />} />
                        <Route path="/faculty_dashboard/student_marks" element={<FacultyMarks />} />
                    </Route>

                    <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
                        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
                        <Route path="/admin/users" element={<UserListAdmin />} />
                        <Route path="/admin/apartments" element={<ApartmentsListAdmin />} />
                        <Route path="/admin/owners" element={<OwnersListAdmin />} />
                    </Route>
                </Routes>
            </NotificationsProvider >
        </AuthProvider>
    );
};

export default App;