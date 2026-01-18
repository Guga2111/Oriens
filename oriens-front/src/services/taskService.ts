import apiClient from './api';
import { TaskDTO, Priority, Status } from '@/types/task';
import { Page } from '@/types/financial';

export interface TaskFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  status?: Status;
  priority?: Priority;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const getAllTasks = async (
  userId: number,
  params: TaskFilters
): Promise<Page<TaskDTO>> => {
  const response = await apiClient.get(`/task/user/${userId}/all`, { params });
  return response.data;
};
