import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import "./DashboardFaculty.css";
import Bara_navigatie_facultate from "./Bara_navigatie_facultate"; // Your Navbar component

const DashboardFaculty: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    useEffect(() => { }, [id]);
    return (<Bara_navigatie_facultate />);
};

export default DashboardFaculty;