import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('kg_session_id'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      authService.validateSession(sessionId)
        .then(data => {
          if (data.success) setUser(data.user);
          else { localStorage.removeItem('kg_session_id'); setSessionId(null); }
        })
        .catch(() => { localStorage.removeItem('kg_session_id'); setSessionId(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    if (data.success && data.sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem('kg_session_id', data.sessionId);
      setUser(data.user);
    }
    return data;
  }, []);

  const register = useCallback(async (email, phone, password, name) => {
    return authService.register(email, phone, password, name);
  }, []);

  const verify = useCallback(async (userId, code) => {
    const data = await authService.verify(userId, code);
    if (data.success && data.sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem('kg_session_id', data.sessionId);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSessionId(null);
    localStorage.removeItem('kg_session_id');
  }, []);

  const refreshUser = useCallback(async () => {
    if (sessionId) {
      const data = await authService.validateSession(sessionId);
      if (data.success) setUser(data.user);
    }
  }, [sessionId]);

  return (
    <AuthContext.Provider value={{ user, sessionId, loading, login, register, verify, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
