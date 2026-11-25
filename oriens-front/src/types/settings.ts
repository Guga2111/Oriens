export type Theme = "light" | "dark";
/** How a task opens: side panel, modal or full screen. */
export type TaskView = "peek" | "modal" | "full";

export interface UserPreferences {
  notifications: boolean;
  sound: boolean;
  theme: Theme;
  /** Absent until the API answers with it. */
  taskView?: TaskView;
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
  value: boolean | Theme | TaskView;
}

export interface PreferenceUpdateRequest {
  [key: string]: boolean | Theme | TaskView;
}
