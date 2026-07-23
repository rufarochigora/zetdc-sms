import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { http, setAuthToken } from '../api/httpClient';
import { disconnectSocket } from '../api/socketClient';

// NOTE on token storage: the JWT is kept in React state only (in memory),
// never in localStorage. That's a constraint of this artifact-style build
// environment as much as a security choice; for a real deployment behind
// its own domain, an httpOnly cookie set by the backend is the better
// production pattern (survives refresh, immune to XSS token theft) - this
// is a follow-up decision to revisit before going to production, since as
// built here a page refresh will log the user out.
const AuthContext = createContext(null);

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { role: payload.role, email: payload.email, id: payload.id };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { token: newToken } = await http.post('/api/auth/login', { email, password });
      setAuthToken(newToken);
      setToken(newToken);
      setUser(decodeRole(newToken));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  const value = useMemo(
    () => ({ token, user, error, login, logout, isAuthenticated: !!token }),
    [token, user, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
