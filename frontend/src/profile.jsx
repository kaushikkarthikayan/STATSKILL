import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

/* The signed-in student's profile (avatar, theme, course) shared by the top bar, dashboard and profile page.
   The colours must match THEMES in backend/app/services/options.py. */
export const THEME_COLORS = {
  lime: "#BDF700",
  sunshine: "#FFD60A",
  tangerine: "#FF9F43",
  sky: "#4FC3F7",
  grape: "#A99BFF",
  bubblegum: "#FF7EB6",
  mint: "#5ED38A",
  ocean: "#3A45B5",
};

/* Dark text on light colours, white text on dark ones. */
export function inkFor(hex) {
  const value = parseInt(String(hex || "#BDF700").replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "#0B0B0B" : "#FFFFFF";
}

/* Sets the accent colour used across the website. Pass null to go back to the default lime. */
export function applyTheme(id) {
  const root = document.documentElement;
  const color = THEME_COLORS[id];
  if (!color) {
    root.style.removeProperty("--theme");
    root.style.removeProperty("--theme-ink");
    return;
  }
  root.style.setProperty("--theme", color);
  root.style.setProperty("--theme-ink", inkFor(color));
}

const ProfileContext = createContext({ profile: null, reload: async () => null, setProfile: () => {} });
export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  const reload = useCallback(async () => {
    try {
      const fresh = await api.get("/profile");
      setProfile(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const theme = profile?.theme || null;
  useEffect(() => {
    applyTheme(theme);
    return () => applyTheme(null);
  }, [theme]);

  const value = useMemo(() => ({ profile, reload, setProfile }), [profile, reload]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
