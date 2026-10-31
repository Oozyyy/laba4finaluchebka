import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { api, money } from '../api.js';
import { State, ErrorBox } from '../components/Ui.jsx';

// Блок отзывов по услуге: список и форма добавления
function Reviews({ serviceId, onChanged }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(`/services/${serviceId}/reviews`);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    if (form.comment.trim().length < 3) return setFormError('Комментарий должен содержать минимум 3 символа');
    if (form.comment.trim().length > 1000) return setFormError('Комментарий не длиннее 1000 символов');
    setBusy(true);
    try {
      await api(`/services/${serviceId}/reviews`, { method: 'POST', body: form });
      setForm({ rating: 5, comment: '' });
      await reload();
      onChanged();
    } catch (e) {
      setFormError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="reviews">
      <State loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 && <p className="muted">Отзывов пока нет.</p>}
        {data && data.map((r) => (
          <div key={r.id} className="review">
            <b>{r.author}</b> <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            <p>{r.comment}</p>
          </div>
        ))}
      </State>
      {user ? (
        <form onSubmit={submit} className="review-form">
          <ErrorBox message={formError} />
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>Оценка: {n}</option>)}
          </select>
          <textarea rows="2" placeholder="Ваш отзыв" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <button className="primary" disabled={busy}>Оставить отзыв</button>
        </form>
      ) : (
        <p className="muted">Чтобы оставить отзыв, войдите в аккаунт.</p>
      )}
    </div>
  );
}

// Страница каталога услуг с фильтрами
export default function Catalog() {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [openReviews, setOpenReviews] = useState(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const cats = useFetch('/categories');
  const query = new URLSearchParams({ category, min, max }).toString();
  const services = useFetch('/services?' + query);

  const priceError = min !== '' && max !== '' && Number(min) > Number(max) ? 'Минимальная цена больше максимальной' : '';

  // Добавление услуги в серверную корзину
  async function addToCart(s) {
    if (!user) return navigate('/login', { state: { from: '/' } });
    setActionError('');
    try {
      await add(s.id);
      setNotice(`«${s.title}» добавлена в корзину`);
      setTimeout(() => setNotice(''), 2500);
    } catch (e) {
      setActionError(e.message);
    }
  }

  return (
    <>
      <h1>Каталог услуг</h1>
      <div className="card filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все категории</option>
          {cats.data && cats.data.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <input type="number" min="0" placeholder="Цена от" value={min} onChange={(e) => setMin(e.target.value)} />
        <input type="number" min="0" placeholder="Цена до" value={max} onChange={(e) => setMax(e.target.value)} />
        <button onClick={() => { setCategory(''); setMin(''); setMax(''); }}>Сбросить</button>
      </div>
      <ErrorBox message={priceError || actionError} />
      {notice && <div className="success">{notice}</div>}
      <State loading={services.loading && !services.data} error={services.error} onRetry={services.reload}>
        {services.data && services.data.length === 0 && <p className="muted">По вашему запросу ничего не найдено. Измените фильтры.</p>}
        <div className="grid">
          {services.data && services.data.map((s) => (
            <div className="card" key={s.id}>
              <span className="tag">{s.category}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <p className="muted">Длительность: {s.duration_minutes} мин</p>
              <p className="muted">{s.rating ? `★ ${s.rating} (${s.reviews_count})` : 'Пока без оценок'}</p>
              <div className="row">
                <b className="price">{money(s.price)}</b>
                <button className="primary" onClick={() => addToCart(s)}>В корзину</button>
              </div>
              <button className="link" onClick={() => setOpenReviews(openReviews === s.id ? null : s.id)}>
                {openReviews === s.id ? 'Скрыть отзывы' : 'Отзывы'}
              </button>
              {openReviews === s.id && <Reviews serviceId={s.id} onChanged={services.reload} />}
            </div>
          ))}
        </div>
      </State>
    </>
  );
}
