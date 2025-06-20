import { useContext } from "react";
import { Navbar, Container, Nav, NavDropdown, Badge } from "react-bootstrap";
import { AuthContext } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./navbar_dashboard_owner.css";
import { useNotifications } from "../NotificationContext";
import { IoIosNotifications } from "react-icons/io";
import { MdNotificationsActive } from "react-icons/md";

function NavBar() {
    const { isAuthenticated, user, logout } = useContext(AuthContext);
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <Navbar expand="lg" className="custom-navbar-owner">
            <Container>
                <Navbar.Toggle aria-controls="basic-navbar-nav-owner" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    {/* Dropdown-uri din partea stanga */}
                    <Nav className="nav nav-underline align-items-center" style={{ gap: "1rem" }}>
                        <Nav.Link as={Link} to="/owner-dashboard">
                            Acasa
                        </Nav.Link>
                        <Nav.Link as={Link} to="/owner/reservation_requests">
                            Cereri
                        </Nav.Link>
                        <Nav.Link as={Link} to="/owner/reservation_history">
                            Istoric rezervari
                        </Nav.Link>
                    </Nav>
                    <Nav
                        justify
                        className="nav nav-underline align-items-center"
                        style={{ gap: "1rem" }}
                    >
                        {isAuthenticated && (<Nav.Link as={Link} to="/notifications">
                            Notificari
                            {unreadCount > 0
                                ? <MdNotificationsActive size={20} color="#dba979" style={{ marginLeft: '4px' }} />
                                : <IoIosNotifications size={20} color="#dba979" style={{ marginLeft: '4px' }} />
                            }
                            {unreadCount > 0 && (
                                <Badge pill bg="danger" className="position-absolute translate-middle">
                                    {unreadCount}
                                </Badge>
                            )}
                        </Nav.Link>)}
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
                                <NavDropdown.Item as={Link} to="/profile_owner">
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
                                    Chat
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