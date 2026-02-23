import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, login, signup } from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  });
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    const bootstrap = async () => {
      try {
        const profile = await fetchMe();
        setUser(profile);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        setToken(null);
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [token]);

  const handleAuthSuccess = (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem(STORAGE_KEYS.token, payload.token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload.user));
  };

  const loginUser = async (payload) => {
    const data = await login(payload);
    handleAuthSuccess(data);
    return data;
  };

  const signupUser = async (payload) => {
    const data = await signup(payload);
    handleAuthSuccess(data);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      loginUser,
      signupUser,
      logout,
      updateUser,
    }),
    [token, user, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
