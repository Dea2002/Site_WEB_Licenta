import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_navigatie_facultate from "./Bara_navigatie_facultate";
import "./FacultyMarks.css";

const FacultyMarks: React.FC = () => {
    return (<Bara_navigatie_facultate />);
};

export default FacultyMarks;