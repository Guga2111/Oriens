import { DashboardData } from '@/types/statistics';
import axios from 'axios';
import { assertWorkIdentity } from '@/lib/work-identity';

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

apiClient.interceptors.response.use(response => {
    if (/^\/(task|project)\//.test(response.config.url ?? '')) assertWorkIdentity(response.data);
    return response;
});

export const getDashboardData = async (userId: string | number, signal?: AbortSignal): Promise<DashboardData> => {
    try {
        const response = await apiClient.get<DashboardData>(
            `/statistics/user/${userId}/dashboard`, { signal }
        );
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        throw error;
    }
};

export default apiClient;