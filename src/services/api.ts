import axios from 'axios';

const api = axios.create({
  baseURL: (() => {
    const url = import.meta.env.VITE_API_URL || '/api';
    if (url.startsWith('http')) {
        return url.endsWith('/api') ? url : `${url}/api`;
    }
    return url;
  })(),
});

export const setupInterceptors = (getAccessToken: () => Promise<string>) => {
  api.interceptors.request.use(
    async (config) => {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

export default api;
