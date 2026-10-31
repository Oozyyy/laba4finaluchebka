import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Провайдер авторизации: хранит текущего пользователя и методы входа/выхода
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const loadUser = useCallback(async () => {
    if (!localStorage.getItem('token')) { setUser(null); setLoading(false); return; }
    try { setUser(await api('/me')); } catch { setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  // Вход или регистрация: сохраняем токен и подгружаем профиль
  async function authenticate(path, body) {
    const { token } = await api(path, { method: 'POST', body });
    localStorage.setItem('token', token);
    await loadUser();
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
