// client/src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Automatically attach JWT token to requests if available in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sharehub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
export default api;
