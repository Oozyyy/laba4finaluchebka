
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте, что API запущен.');
  }
  let data = null;
  try { data = await res.json(); } catch { }
  if (!res.ok) {
    if (res.status === 401 && token) localStorage.removeItem('token');
    throw new Error((data && data.error) || 'Ошибка сервера');
  }
  return data;
}

export const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const phoneRe = /^\+?[0-9\s\-()]{10,18}$/;
