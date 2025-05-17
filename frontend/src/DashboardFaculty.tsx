import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import "./DashboardFaculty.css";


const DashboardFaculty: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    useEffect(() => { }, [id]);
    return (<></>);
};

export default DashboardFaculty;