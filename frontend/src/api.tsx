import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const api = axios.create({
    baseURL: BACKEND_URL
});

export const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    withCredentials: true
});