import apiClient from './api';
import { ProjectDTO } from '@/types/task';
import { Page } from '@/types/financial';

export interface ProjectFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  includeArchived?: boolean;
  search?: string;
}

export const getAllProjects = async (
  userId: number,
  params: ProjectFilters
): Promise<Page<ProjectDTO>> => {
  const response = await apiClient.get(`/project/user/${userId}/all`, { params });
  return response.data;
};

export const archiveProject = async (projectId: number): Promise<ProjectDTO> => {
  const response = await apiClient.patch(`/project/${projectId}/archive`);
  return response.data;
};

export const unarchiveProject = async (projectId: number): Promise<ProjectDTO> => {
  const response = await apiClient.patch(`/project/${projectId}/unarchive`);
  return response.data;
};

// Se você tiver um endpoint de favorito, seria algo assim:
export const toggleFavoriteProject = async (projectId: number): Promise<ProjectDTO> => {
  const response = await apiClient.patch(`/project/${projectId}/favorite`);
  return response.data;
};
