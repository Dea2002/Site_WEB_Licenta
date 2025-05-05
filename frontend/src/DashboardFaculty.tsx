import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import "./DashboardFaculty.css";


const DashboardFaculty: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    useEffect(() => { }, [id]);
    return (<></>);
};

export default DashboardFaculty;