import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

export function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api(path)); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
