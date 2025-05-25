import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
export const api = axios.create({
    baseURL: BACKEND_URL
});

// inainte de fiecare request, adauga header-ul automat
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');   // sau de unde ti-l tii
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    withCredentials: true
});