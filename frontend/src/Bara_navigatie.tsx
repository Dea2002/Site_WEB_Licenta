// import './navbar.css';
// import React, { useContext, useState } from 'react';
// import { AuthContext } from './AuthContext';
// import { Link, useNavigate } from 'react-router-dom';

// function NavBar() {
//     const { isAuthenticated, user, logout } = useContext(AuthContext);
//     const navigate = useNavigate();

//     // stare pentru a sti daca dropdown-ul e deschis sau inchis
//     const [dropdownOpen, setDropdownOpen] = useState(false);

//     const handleLogout = () => {
//         logout();
//         navigate('/');
//     };

//     // Functie care schimba starea dropdown-ului
//     const toggleDropdown = () => {
//         setDropdownOpen(!dropdownOpen);
//     };

//     return (
//         <nav className="navbar">
//             <div className="navbar-container">
//                 <Link to="/" className="navbar-brand">Inchiriere Apartamente</Link>
//                 <ul className="navbar-nav">
//                     <li><Link to="/">Acasa</Link>
//                     </li>
//                     {isAuthenticated ? (
//                         <>
//                             <li>
//                                 <span className="nav-user" onClick={toggleDropdown}>
//                                     {/* Iconita user + numele */}
//                                     <i className="fa-solid fa-circle-user" style={{ fontSize: '30px' }}></i>
//                                     <span style={{ marginLeft: '6px' }}>
//                                         {user?.fullName}</span>
//                                 </span>

//                                 {/* Dropdown-ul apare doar daca dropdownOpen = true */}
//                                 {dropdownOpen && (
//                                     <ul className="dropdown-menu">
//                                         <li>
//                                             <Link to="/profile" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-user-pen" style={{ marginRight: '6px' }}></i>
//                                                 Editeaza cont
//                                             </Link>
//                                         </li>

//                                         <li>
//                                             <Link to="SE VA FACE, SA ARATE ISTORICUL DE CONVERSATII, DAR MOMENTAN NU E4 I" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-comment" style={{ marginRight: '6px' }}></i>
//                                                 Chat history
//                                             </Link>
//                                         </li>

//                                         <li>
//                                             <button
//                                                 onClick={() => {
//                                                     setDropdownOpen(false);
//                                                     handleLogout();
//                                                 }}
//                                             >
//                                                 <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i>
//                                                 Logout
//                                             </button>
//                                         </li>
//                                     </ul>
//                                 )}
//                             </li>
//                         </>
//                     ) : (
//                         <>
//                             {/* Afisez DOAR iconita. Cand dau click, apare dropdown cu Autentificare si inregistreaza-te */}
//                             <li>
//                                 <span className="nav-user" onClick={toggleDropdown} style={{ fontSize: '1.2rem', cursor: 'pointer' }}>
//                                     Cont
//                                 </span>

//                                 {dropdownOpen && (
//                                     <ul className="dropdown-menu">
//                                         <li>
//                                             <Link to="/login" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-user" style={{ marginRight: '6px' }}></i>
//                                                 Autentificare
//                                             </Link>
//                                         </li>
//                                         <li>
//                                             <Link to="/register" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i>
//                                                 Inregistreaza-te
//                                             </Link>
//                                         </li>
//                                     </ul>
//                                 )}
//                             </li>
//                         </>
//                     )}
//                 </ul>
//             </div>
//         </nav >
//     );
// }

// export default NavBar;

// import './navbar.css';
// import React, { useContext, useState } from 'react';
// import { AuthContext } from './AuthContext';
// import { Link, useNavigate } from 'react-router-dom';

// function NavBar() {
//     const { isAuthenticated, user, logout } = useContext(AuthContext);
//     const navigate = useNavigate();

//     // stare pentru a sti daca dropdown-ul e deschis sau inchis
//     const [dropdownOpen, setDropdownOpen] = useState(false);

//     const handleLogout = () => {
//         logout();
//         navigate('/');
//     };

//     // Functie care schimba starea dropdown-ului
//     const toggleDropdown = () => {
//         setDropdownOpen(!dropdownOpen);
//     };

//     // return (
//     //     <nav className="navbar">
//     //         <div className="navbar-container"> {/* asta are space between */}

//     //             <nav>
//     //                 <a className="item">Acasa</a>
//     //                 <div className="item">
//     //                     Cont
//     //                     <div className="dropDown">
//     //                         <div>
//     //                             <Link
//     //                                 to="/login"
//     //                                 onClick={() => setDropdownOpen(false)}
//     //                                 style={{ display: 'flex', alignItems: 'center' }}>
//     //                                 <i className="fa-solid fa-user" style={{ marginRight: '6px' }} />
//     //                                 Autentificare
//     //                             </Link>
//     //                             <Link
//     //                                 to="/register"
//     //                                 onClick={() => setDropdownOpen(false)}
//     //                                 style={{ display: 'flex', alignItems: 'center' }}>
//     //                                 <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }} />
//     //                                 Inregistreaza-te
//     //                             </Link>
//     //                         </div>
//     //                     </div>
//     //                 </div>
//     //                 <div className="underline" />
//     //             </nav>

//     //         </div>
//     //     </nav>

//     // );
//     return (
//         <nav className="navbar">
//             <div className="navbar-container">
//                 <Link to="/" className="navbar-brand">Inchiriere Apartamente</Link>
//                 <ul className="navbar-nav">

//                     {/* item #1 - acasa */}
//                     <li>
//                         <Link to="/">Acasa</Link>
//                     </li>

//                     {/* item #2 - user button */}
//                     {isAuthenticated ? (
//                         <>
//                             <li>
//                                 <span className="nav-user" onClick={toggleDropdown}>
//                                     {/* Iconita user + numele */}
//                                     <i className="fa-solid fa-circle-user" style={{ fontSize: '30px' }} />
//                                     <span style={{ marginLeft: '6px' }}>
//                                         {user?.fullName}
//                                     </span>
//                                 </span>

//                                 {/* Dropdown-ul apare doar daca dropdownOpen = true */}
//                                 {dropdownOpen && (
//                                     <ul className="dropdown-menu">
//                                         <li>
//                                             <Link
//                                                 to="/profile"
//                                                 onClick={() => setDropdownOpen(false)}
//                                                 style={{ display: 'flex', alignItems: 'center' }}
//                                             >
//                                                 <i className="fa-solid fa-user-pen" style={{ marginRight: '6px' }} />
//                                                 Editeaza cont
//                                             </Link>
//                                         </li>

//                                         <li>
//                                             <Link
//                                                 to="SE VA FACE, SA ARATE ISTORICUL DE CONVERSATII, DAR MOMENTAN NU E4 I"
//                                                 onClick={() => setDropdownOpen(false)}
//                                                 style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-comment" style={{ marginRight: '6px' }} />
//                                                 Chat history
//                                             </Link>
//                                         </li>

//                                         <li>
//                                             <Link to="/"
//                                                 onClick={() => {
//                                                     setDropdownOpen(false);
//                                                     handleLogout();
//                                                 }}
//                                             >
//                                                 <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }} />
//                                                 Logout
//                                             </Link>
//                                         </li>
//                                     </ul>
//                                 )}
//                             </li>
//                         </>
//                     ) : (
//                         <>
//                             {/* Afisez DOAR iconita. Cand dau click, apare dropdown cu Autentificare si inregistreaza-te */}
//                             <li>
//                                 <span className="nav-user" onClick={toggleDropdown} style={{ cursor: 'pointer' }}>
//                                     Cont
//                                 </span>

//                                 {dropdownOpen && (
//                                     <ul className="dropdown-menu">
//                                         <li>
//                                             <Link
//                                                 to="/login"
//                                                 onClick={() => setDropdownOpen(false)}
//                                                 style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-user" style={{ marginRight: '6px' }} />
//                                                 Autentificare
//                                             </Link>
//                                         </li>
//                                         <li>
//                                             <Link
//                                                 to="/register"
//                                                 onClick={() => setDropdownOpen(false)}
//                                                 style={{ display: 'flex', alignItems: 'center' }}>
//                                                 <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }} />
//                                                 Inregistreaza-te
//                                             </Link>
//                                         </li>
//                                     </ul>
//                                 )}
//                             </li>
//                         </>
//                     )}
//                     {/* underline pentru item #1 si #2 */}
//                     <div className="underline" />
//                 </ul>
//             </div>
//         </nav >
//     );
// }

// export default NavBar;

import React, { useContext } from "react";
import { Navbar, Container, Nav, NavDropdown } from "react-bootstrap";
import { AuthContext } from "./AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./navbar.css";

function NavBar() {
    const { isAuthenticated, user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <Navbar expand="lg" className="custom-navbar">
            <Container>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav
                        justify
                        className="nav nav-underline align-items-center"
                        style={{ gap: "1rem" }}
                    >
                        <Nav.Link as={Link} to="/">
                            Acasa
                        </Nav.Link>
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
                                <NavDropdown.Item as={Link} to="/profile">
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
