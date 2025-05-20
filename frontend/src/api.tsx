import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
console.log('Backend URL:', BACKEND_URL);
export const api = axios.create({
    baseURL: BACKEND_URL
});

// înainte de fiecare request, adaugă header-ul automat
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');   // sau de unde ți-l ții
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