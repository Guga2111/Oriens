import { DashboardData } from '@/types/statistics';
import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use(
    (config) => {
        
        const token = localStorage.getItem('authToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;

    },
    (error) => {
        return Promise.reject(error);
    }
);

export const getDashboardData = async (userId: string | number): Promise<DashboardData> => {
    try {
        const response = await apiClient.get<DashboardData>(
            `/statistics/user/${userId}/dashboard`
        );
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        throw error;
    }
};

export default apiClient;