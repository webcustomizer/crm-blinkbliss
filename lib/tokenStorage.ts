// src/lib/tokenStorage.ts
import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "refresh_token";

export const tokenStorage = {
  async setToken(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
  },

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  },

  async setRefreshToken(token: string): Promise<void> {
    await Preferences.set({ key: REFRESH_KEY, value: token });
  },

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_KEY });
    return value;
  },

  async clearAll(): Promise<void> {
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: REFRESH_KEY });
  },
};
