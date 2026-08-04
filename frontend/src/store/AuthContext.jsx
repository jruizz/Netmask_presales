import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'netmask_presales_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/auth/me', { token })
      .then(setMe)
      .catch(() => {
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(correo, password) {
    const { token: newToken, user } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { correo, password },
    });
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setMe(user);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setMe(null);
  }

  return (
    <AuthContext.Provider value={{ token, me, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
