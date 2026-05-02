import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../api/http.js";

const STORAGE_KEY = "auth_session";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const login = useCallback(async (username, password) => {
    const data = await apiFetch("/api/auth/login", {
      skipAuth: true,
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const next = {
      token: data.token,
      userid: String(data.userid),
      username: String(data.username),
      expiration: data.expiration,
    };
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY))
        await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch {
    }
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, setSession, login, logout }),
    [session, login, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("AuthProvider ausente");
  return ctx;
}
