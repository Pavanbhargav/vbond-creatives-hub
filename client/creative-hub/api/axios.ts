import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  headers: {},
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // If it's a 401 and we haven't retried yet, and it's not the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/accounts/refresh/") {
      originalRequest._retry = true;
      try {
        await api.post("/accounts/refresh/");
        return api.request(originalRequest);
      } catch (refreshError) {
        // If the refresh token is also invalid/expired
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
