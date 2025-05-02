import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import "./UserListAdmin.css";

interface User {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    phoneNumber: string;
    faculty: string;
    gender: string;
    createdAt: Date;
    // pot sa pun si alte detalii despre useri
}

interface NewUserFormState {
    email: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    password: string;
    faculty: string;
    gender: string;
    createdAt: Date;
}

const UserListAdmin: React.FC = () => {
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>(""); // Pentru a gestiona erorile
    const [successMessage, setSuccessMessage] = useState<string>(""); // Pentru mesaje de succes
    const [newUserForm, setNewUserForm] = useState<NewUserFormState>({
        email: "",
        fullName: "",
        phoneNumber: "",
        role: "client",
        password: "",
        faculty: "",
        gender: "",
        createdAt: new Date(),
    });

    useEffect(() => {
        axios
            .get("http://localhost:5000/admin/users", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setUsers(response.data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Eroare la obtinerea utilizatorilor:", error);
                setLoading(false);
            });
    }, [token]);

    const handleDeleteUser = (userId: string) => {
        if (window.confirm("Esti sigur ca vrei sa stergi acest utilizator?")) {
            axios
                .delete(`http://localhost:5000/admin/users/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setSuccessMessage("Utilizatorul a fost sters cu succes.");
                    setUsers(users.filter((user) => user._id !== userId));
                    setTimeout(() => setSuccessMessage(""), 3000);
                })
                .catch((error) => {
                    console.error("Eroare la stergerea utilizatorului:", error);
                    setError("Nu s-a putut sterge utilizatorul.");
                });
        }
    };

    const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewUserForm((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    // Pentru adaugarea de useri
    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        axios
            .post("http://localhost:5000/admin/users", newUserForm, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setSuccessMessage("Utilizatorul a fost adaugat cu succes.");
                // Adauga noul utilizator in starea users
                setUsers((prevUsers) => [...prevUsers, response.data]);
                // Reseteaza formularul
                setNewUserForm({
                    email: "",
                    fullName: "",
                    phoneNumber: "",
                    role: "client",
                    password: "",
                    faculty: "",
                    gender: "",
                    createdAt: new Date(),
                });
                setTimeout(() => setSuccessMessage(""), 3000);
            })
            .catch((error) => {
                console.error("Eroare la adaugarea utilizatorului:", error);
                setError("Nu s-a putut adauga utilizatorul.");
            });
    };

    if (loading) {
        return <p>Se incarca utilizatorii...</p>;
    }

    return (
        <div className="admin-users-container">
            <h1>Lista de Utilizatori</h1>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            {/* Formular pentru adaugarea unui nou utilizator */}
            <div className="add-user-form">
                <h2>Adauga un nou utilizator</h2>
                <form onSubmit={handleAddUser}>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={newUserForm.email}
                            onChange={handleNewUserChange}
                            required
                        />
                    </div>
                    <div>
                        <label>Nume complet:</label>
                        <input
                            type="text"
                            name="fullName"
                            value={newUserForm.fullName}
                            onChange={handleNewUserChange}
                            required
                        />
                    </div>
                    <div>
                        <label>Numar de telefon:</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={newUserForm.phoneNumber}
                            onChange={handleNewUserChange}
                            required
                        />
                    </div>
                    <div>
                        <label>Rol:</label>
                        <select
                            name="role"
                            value={newUserForm.role}
                            onChange={handleNewUserChange}
                            required
                        >
                            <option value="user">User</option>
                            <option value="proprietar">Proprietar</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label>Parola:</label>
                        <input
                            type="password"
                            name="password"
                            value={newUserForm.password}
                            onChange={handleNewUserChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label>Facultate:</label>
                        <input
                            type="text"
                            name="faculty"
                            value={newUserForm.faculty}
                            onChange={handleNewUserChange}
                            required
                        />
                    </div>
                    <div>
                        <label>Gen:</label>
                        <input
                            type="text"
                            name="gender"
                            value={newUserForm.gender}
                            onChange={handleNewUserChange}
                            required
                        />
                    </div>
                    <button type="submit">Adauga Utilizator</button>
                </form>
            </div>

            <div className="users-list">
                {users.map((user) => (
                    <div key={user._id} className="user-card">
                        <div className="user-name">
                            <h2>{user.fullName}</h2>
                        </div>
                        <div className="user-info">
                            {/* <h2>{user.fullName}</h2> */}
                            <p>
                                <strong>Email:</strong> {user.email}
                            </p>
                            <p>
                                <strong>Telefon:</strong> {user.phoneNumber}
                            </p>
                            <p>
                                <strong>Rol:</strong> {user.role}
                            </p>
                        </div>
                        <button
                            className="delete-button"
                            onClick={() => handleDeleteUser(user._id)}
                        >
                            sterge
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserListAdmin;
