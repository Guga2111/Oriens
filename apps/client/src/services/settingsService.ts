import apiClient from "./api";
import { UserPreferences, PreferenceUpdateRequest } from "@/types/settings";

export const settingsService = {

  getPreferences: async (userId: number): Promise<UserPreferences> => {
    try {
      const response = await apiClient.get<UserPreferences>(
        `/user/${userId}/preferences`
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar preferências:", error);
      throw error;
    }
  },

  updatePreferences: async (
    userId: number,
    preferences: PreferenceUpdateRequest
  ): Promise<UserPreferences> => {
    try {
      const response = await apiClient.patch<UserPreferences>(
        `/user/${userId}/preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao atualizar preferências:", error);
      throw error;
    }
  },

  updatePreference: async (
    userId: number,
    key: keyof UserPreferences,
    value: boolean | string
  ): Promise<UserPreferences> => {
    return settingsService.updatePreferences(userId, { [key]: value } as PreferenceUpdateRequest);
  },

  deleteAccount: async (userId: number): Promise<void> => {
    try {
      await apiClient.delete(`/user/${userId}`);
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      throw error;
    }
  },
};

export default settingsService;
