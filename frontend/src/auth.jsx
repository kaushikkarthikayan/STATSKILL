import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, tokenStore } from "./api.js";
import { Loading } from "./ui.jsx";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session when the page opens.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    api
      .get("/auth/me")
      .then((me) => active && setUser(me))
      .catch(() => tokenStore.clear())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the API (expired or ended session) signs the student out here.
  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      setUser(null);
    };
    window.addEventListener("statskill:session-expired", onExpired);
    return () => window.removeEventListener("statskill:session-expired", onExpired);
  }, []);

  const startSession = useCallback((session, remember) => {
    tokenStore.set(session.access_token, remember);
    setUser(session.user);
    return session;
  }, []);

  const login = useCallback(
    async (email, password, remember) =>
      startSession(await api.publicPost("/auth/login", { email, password, remember_me: remember }), remember),
    [startSession]
  );
  const register = useCallback(
    async (fullName, email, password, confirmPassword) =>
      startSession(
        await api.publicPost("/auth/register", {
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        }),
        false
      ),
    [startSession]
  );
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* the session may already have ended */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Pages inside the app. `roles` limits a page to staff or administrators.
export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
