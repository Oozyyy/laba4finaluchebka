import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true); setError('');
    try { setItems(await api('/cart')); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const add = async (serviceId) => setItems(await api('/cart', { method: 'POST', body: { serviceId } }));
  const setQty = async (id, quantity) => setItems(await api('/cart/' + id, { method: 'PATCH', body: { quantity } }));
  const remove = async (id) => setItems(await api('/cart/' + id, { method: 'DELETE' }));

  return (
    <CartContext.Provider value={{ items, loading, error, reload, add, setQty, remove }}>
      {children}
    </CartContext.Provider>
  );
}
