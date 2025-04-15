// src/api/axios.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',  // Replace with your actual backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Include credentials (cookies) in requests if needed
});

export default axiosInstance;
