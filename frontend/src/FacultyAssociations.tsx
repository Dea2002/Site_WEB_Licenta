import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_navigatie_facultate from "./Bara_navigatie_facultate";
import "./FacultyAssociations.css";

const FacultyAssociations: React.FC = () => {
    return (<><Bara_navigatie_facultate />
        <p>asocieri</p></>
    );
};

export default FacultyAssociations;