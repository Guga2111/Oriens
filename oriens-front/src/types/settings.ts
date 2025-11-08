export type Theme = "light" | "dark";

export interface UserPreferences {
  notifications: boolean;
  sound: boolean;
  theme: Theme;
}

export interface UserSettings {
  userId: number;
  email: string;
  username: string;
  profileImageUrl: string | null;
  preferences: UserPreferences;
}

export interface UpdatePreferencePayload {
  key: keyof UserPreferences;
  value: boolean | Theme;
}

export interface PreferenceUpdateRequest {
  [key: string]: boolean | Theme;
}
