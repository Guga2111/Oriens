import apiClient from './api';
import { EntryDTO, TagDTO, Page } from '@/types/financial';

// Entry Services
export const createEntry = async (userId: number, entry: EntryDTO): Promise<EntryDTO> => {
  const response = await apiClient.post(`/financial/user/${userId}/entries`, entry);
  return response.data;
};

export const getEntry = async (userId: number, entryId: number): Promise<EntryDTO> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries/${entryId}`);
  return response.data;
};

export const getAllEntries = async (
  userId: number,
  params: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
    tagId?: number;
    search?: string;
  }
): Promise<Page<EntryDTO>> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries`, { params });
  return response.data;
};

export const updateEntry = async (userId: number, entryId: number, entry: EntryDTO): Promise<EntryDTO> => {
  const response = await apiClient.put(`/financial/user/${userId}/entries/${entryId}`, entry);
  return response.data;
};

export const deleteEntry = async (userId: number, entryId: number): Promise<void> => {
  await apiClient.delete(`/financial/user/${userId}/entries/${entryId}`);
};

export const countEntries = async (userId: number): Promise<number> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries/count`);
  return response.data;
};

// Tag Services
export const createTag = async (userId: number, tag: TagDTO): Promise<TagDTO> => {
  const response = await apiClient.post(`/financial/user/${userId}/tags`, tag);
  return response.data;
};

export const getTag = async (userId: number, tagId: number): Promise<TagDTO> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/${tagId}`);
  return response.data;
};

export const getAllTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags`);
  return response.data;
};

export const getDefaultTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/default`);
  return response.data;
};

export const getCustomTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/custom`);
  return response.data;
};

export const updateTag = async (userId: number, tagId: number, tag: TagDTO): Promise<TagDTO> => {
  const response = await apiClient.put(`/financial/user/${userId}/tags/${tagId}`, tag);
  return response.data;
};

export const deleteTag = async (userId: number, tagId: number): Promise<void> => {
  await apiClient.delete(`/financial/user/${userId}/tags/${tagId}`);
};
