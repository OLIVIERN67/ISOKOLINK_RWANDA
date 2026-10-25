import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, getApiError } from "../services/api";
import type { AuthUser } from "../types";
import { subscribeToAuthChanges } from "../utils/authEvents";

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  preferredLanguage?: string;
  acceptTerms: true;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<{
    user: AuthUser;
    emailDelivered: boolean;
    devVerificationToken?: string;
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (updater: (current: AuthUser) => AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await authApi.me();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const current = await authApi.login({ email, password });
    setUser(current);
    return current;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      const message = getApiError(error).message;
      if (import.meta.env.DEV) console.warn("Logout request failed:", message);
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updater: (current: AuthUser) => AuthUser) => {
    setUser((current) => (current ? updater(current) : current));
  }, []);

  const hasRole = useCallback((role: string) => Boolean(user?.roles.includes(role)), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      hasRole,
      login,
      register,
      logout,
      refresh,
      updateUser,
    }),
    [user, loading, hasRole, login, register, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
