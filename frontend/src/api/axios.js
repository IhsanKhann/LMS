// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // only needed for refresh cookies
});

// ── DEV: skip attaching token if none exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Dev mode: skip auth header to avoid breaking requests
    // console.log("No token, proceeding without Authorization header");
  }
  return config;
});

// ── DEV: skip auto-refresh in dev mode
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // You can choose to skip refresh for dev mode
    return Promise.reject(error);
  }
);

export default api;