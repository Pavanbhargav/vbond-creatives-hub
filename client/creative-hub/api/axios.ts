import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await api.post("/accounts/refresh/");
        return api.request(error.config);
      } catch (refreshError) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
