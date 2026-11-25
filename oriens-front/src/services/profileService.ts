import apiClient from './api';

export async function uploadProfileImage(userId: number, file: File) {
  const form = new FormData();
  form.append('profileImage', file);
  const { data } = await apiClient.put<{ profileImageUrl: string }>(`/user/${userId}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.profileImageUrl;
}
