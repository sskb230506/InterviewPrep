import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMe, login, signup } from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // One-time cleanup: remove legacy 'token'/'user' keys left by the old api.js.
  // If these exist alongside 'aiprep_token', they would confuse getAuthToken().
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  });
  // isBootstrapping = true only on the initial cold page load when we need to re-validate
  // a stored token. It is NOT set to true during loginUser/signupUser calls.
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  // Track whether the current token change came from a fresh login/signup
  // so we can skip the redundant bootstrap call (we already have the user).
  const skipBootstrapRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    // Fresh login/signup — user object is already set, skip the extra /me call
    if (skipBootstrapRef.current) {
      skipBootstrapRef.current = false;
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
    // Mark this as a fresh login so the token-change effect skips re-bootstrapping.
    // We already have the user from the login/signup response — no need to call /me again.
    skipBootstrapRef.current = true;
    setUser(payload.user);
    localStorage.setItem(STORAGE_KEYS.token, payload.token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload.user));
    setToken(payload.token); // triggers the useEffect, which will see skipBootstrapRef=true
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
