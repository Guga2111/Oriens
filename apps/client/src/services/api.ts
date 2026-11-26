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
    const path = response.config.url ?? '';
    if (/^\/(task|project)\//.test(path) && !/^\/task\/\d+\/attachments(?:\/|$)/.test(path)) {
        assertWorkIdentity(response.data);
    }
    return response;
});

export const getDashboardData = async (userId: string | number, signal?: AbortSignal): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>(
        `/statistics/user/${userId}/dashboard`, { signal }
    );
    return response.data;
};

export default apiClient;
