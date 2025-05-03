import React, { useContext } from "react";
import { Navbar, Container, Nav, NavDropdown } from "react-bootstrap";
import { AuthContext } from "./AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./navbar_dashboard_faculty.css";


function NavBar() {
    const { isAuthenticated, user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (<Navbar expand="lg" className="custom-navbar-faculty">
        <Container>
            <Navbar.Toggle aria-controls="basic-navbar-nav-faculty" />
            <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                {/* Dropdown-uri din partea stanga */}
                <Nav className="nav nav-underline align-items-center" style={{ gap: "1rem" }}>
                    <NavDropdown title='Cereri'>
                        <NavDropdown.Item as={Link} to="/faculty_dashboard/associations">
                            Asociere cu facultatea
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/faculty_dashboard/student_marks">
                            Validare medii
                        </NavDropdown.Item>
                    </NavDropdown>
                </Nav>

                {/* Meniul din dreapta */}
                {isAuthenticated ? (
                    <Nav justify className="nav  nav-underline">
                        <NavDropdown
                            title={
                                <span>
                                    <i
                                        className="fa-solid fa-circle-user"
                                        style={{ fontSize: "20px" }}
                                    />
                                    <span style={{ marginLeft: "6px" }}>{user?.fullName}</span>
                                </span>
                            }
                            id="user-nav-dropdown"
                            align="end"
                        >
                            <NavDropdown.Item as={Link} to="/profile_faculty">
                                <i
                                    className="fa-solid fa-user-pen"
                                    style={{ marginRight: "6px" }}
                                />
                                Editeaza cont
                            </NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/chat-history">
                                <i
                                    className="fa-solid fa-comment"
                                    style={{ marginRight: "6px" }}
                                />
                                Chat history
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item onClick={handleLogout}>
                                <i
                                    className="fa-solid fa-right-from-bracket"
                                    style={{ marginRight: "6px" }}
                                />
                                Logout
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                ) : (
                    <Nav justify className="nav nav-underline">
                        <NavDropdown title="Cont" id="guest-nav-dropdown" align="end">
                            <NavDropdown.Item as={Link} to="/login">
                                <i
                                    className="fa-solid fa-user"
                                    style={{ marginRight: "6px" }}
                                />
                                Autentificare
                            </NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/register">
                                <i
                                    className="fa-solid fa-user-plus"
                                    style={{ marginRight: "6px" }}
                                />
                                Inregistreaza-te
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                )}
            </Navbar.Collapse>
        </Container>
    </Navbar>
    );
}

export default NavBar;