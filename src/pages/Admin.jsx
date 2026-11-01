import { useState } from 'react';
import { useFetch } from '../useFetch.js';
import { api, money, emailRe, phoneRe } from '../api.js';
import { State, ErrorBox, Field } from '../components/Ui.jsx';

async function run(action, setError, after, confirmText) {
  if (confirmText && !window.confirm(confirmText)) return;
  setError('');
  try { await action(); await after(); } catch (e) { setError(e.message); }
}

function ServicesTab() {
  const list = useFetch('/services');
  const cats = useFetch('/categories');
  const empty = { title: '', description: '', duration: '', price: '', categoryId: '' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  function validate() {
    const e = {};
    if (form.title.trim().length < 2) e.title = 'Минимум 2 символа';
    if (form.description.trim().length < 5) e.description = 'Минимум 5 символов';
    if (!Number.isInteger(Number(form.duration)) || Number(form.duration) < 1 || Number(form.duration) > 1440) e.duration = 'Целое число от 1 до 1440';
    if (!(Number(form.price) > 0)) e.price = 'Цена должна быть больше нуля';
    if (!form.categoryId) e.categoryId = 'Выберите категорию';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    await run(
      () => api(editing ? `/admin/services/${editing}` : '/admin/services', { method: editing ? 'PUT' : 'POST', body: form }),
      setError,
      async () => { setForm(empty); setEditing(null); await list.reload(); }
    );
  }

  function startEdit(s) {
    const cat = cats.data?.find((c) => c.name === s.category);
    setEditing(s.id);
    setForm({ title: s.title, description: s.description, duration: String(s.duration_minutes), price: String(s.price), categoryId: cat ? String(cat.id) : '' });
  }

  return (
    <>
      <form className="card" onSubmit={submit} noValidate>
        <h3>{editing ? 'Изменение услуги' : 'Новая услуга'}</h3>
        <ErrorBox message={error} />
        <Field label="Название" value={form.title} error={errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Field label="Описание" value={form.description} error={errors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Field label="Длительность (мин)" type="number" value={form.duration} error={errors.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        <Field label="Цена" type="number" value={form.price} error={errors.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <label className="field">
          <span>Категория</span>
          <select value={form.categoryId} className={errors.categoryId ? 'invalid' : ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Выберите...</option>
            {cats.data && cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <small className="field-error">{errors.categoryId}</small>}
        </label>
        <div className="row">
          <button className="primary">{editing ? 'Сохранить' : 'Добавить'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); setErrors({}); }}>Отмена</button>}
        </div>
      </form>
      <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
        <div className="card">
          {list.data && list.data.map((s) => (
            <div className="cart-row" key={s.id}>
              <div><b>{s.title}</b><div className="muted">{s.category}, {s.duration_minutes} мин, {money(s.price)}</div></div>
              <div className="row">
                <button onClick={() => startEdit(s)}>Изменить</button>
                <button className="danger" onClick={() => run(() => api(`/admin/services/${s.id}`, { method: 'DELETE' }), setError, list.reload, `Удалить услугу «${s.title}»?`)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </State>
    </>
  );
}
function CategoriesTab() {
  const list = useFetch('/categories');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');

  async function submit(ev) {
    ev.preventDefault();
    setFieldError('');
    if (name.trim().length < 2 || name.trim().length > 60) return setFieldError('Название: от 2 до 60 символов');
    await run(
      () => api(editing ? `/admin/categories/${editing}` : '/admin/categories', { method: editing ? 'PUT' : 'POST', body: { name } }),
      setError,
      async () => { setName(''); setEditing(null); await list.reload(); }
    );
  }

  return (
    <>
      <form className="card" onSubmit={submit} noValidate>
        <h3>{editing ? 'Изменение категории' : 'Новая категория'}</h3>
        <ErrorBox message={error} />
        <Field label="Название" value={name} error={fieldError} onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <button className="primary">{editing ? 'Сохранить' : 'Добавить'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }}>Отмена</button>}
        </div>
      </form>
      <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
        <div className="card">
          {list.data && list.data.map((c) => (
            <div className="cart-row" key={c.id}>
              <b>{c.name}</b>
              <div className="row">
                <button onClick={() => { setEditing(c.id); setName(c.name); }}>Изменить</button>
                <button className="danger" onClick={() => run(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }), setError, list.reload, `Удалить категорию «${c.name}»?`)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </State>
    </>
  );
}

function OrdersTab() {
  const list = useFetch('/admin/orders');
  const statuses = useFetch('/admin/statuses');
  const [error, setError] = useState('');
  return (
    <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
      <ErrorBox message={error} />
      {list.data && list.data.length === 0 && <p className="muted">Заказов нет.</p>}
      {list.data && list.data.map((o) => (
        <div className="card" key={o.id}>
          <div className="row">
            <b>{o.customer} ({o.customer_email})</b>
            <select value={o.status} onChange={(e) => run(() => api(`/admin/orders/${o.id}`, { method: 'PUT', body: { status: e.target.value } }), setError, list.reload)}>
              {statuses.data && statuses.data.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="muted">Дата: {o.delivery_date}, адрес: {o.address}</div>
          <ul>{o.items.map((i, n) => <li key={n}>{i.title} × {i.quantity}</li>)}</ul>
          <div className="row">
            <b>Итого: {money(o.total)}</b>
            <button className="danger" onClick={() => run(() => api(`/admin/orders/${o.id}`, { method: 'DELETE' }), setError, list.reload, 'Удалить заказ?')}>Удалить</button>
          </div>
        </div>
      ))}
    </State>
  );
}

function ReviewsTab() {
  const list = useFetch('/admin/reviews');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [error, setError] = useState('');

  async function save() {
    if (form.comment.trim().length < 3) return setError('Комментарий: минимум 3 символа');
    await run(() => api(`/admin/reviews/${editing}`, { method: 'PUT', body: form }), setError, async () => { setEditing(null); await list.reload(); });
  }

  return (
    <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
      <ErrorBox message={error} />
      {list.data && list.data.length === 0 && <p className="muted">Отзывов нет.</p>}
      {list.data && list.data.map((r) => (
        <div className="card" key={r.id}>
          <div className="muted">{r.service} — {r.author}</div>
          {editing === r.id ? (
            <>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <textarea rows="2" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              <div className="row"><button className="primary" onClick={save}>Сохранить</button><button onClick={() => setEditing(null)}>Отмена</button></div>
            </>
          ) : (
            <>
              <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <p>{r.comment}</p>
              <div className="row">
                <button onClick={() => { setEditing(r.id); setForm({ rating: r.rating, comment: r.comment }); setError(''); }}>Изменить</button>
                <button className="danger" onClick={() => run(() => api(`/admin/reviews/${r.id}`, { method: 'DELETE' }), setError, list.reload, 'Удалить отзыв?')}>Удалить</button>
              </div>
            </>
          )}
        </div>
      ))}
    </State>
  );
}

function UsersTab() {
  const list = useFetch('/admin/users');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  async function save() {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Минимум 2 символа';
    if (!emailRe.test(form.email.trim())) e.email = 'Некорректный email';
    if (!phoneRe.test(form.phone.trim())) e.phone = 'Некорректный телефон';
    setErrors(e);
    if (Object.keys(e).length) return;
    await run(() => api(`/admin/users/${editing}`, { method: 'PUT', body: form }), setError, async () => { setEditing(null); await list.reload(); });
  }

  return (
    <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
      <ErrorBox message={error} />
      {list.data && list.data.map((u) => (
        <div className="card" key={u.id}>
          {editing === u.id ? (
            <>
              <Field label="ФИО" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <Field label="Email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Field label="Телефон" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Field label="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="row"><button className="primary" onClick={save}>Сохранить</button><button onClick={() => setEditing(null)}>Отмена</button></div>
            </>
          ) : (
            <div className="row">
              <div><b>{u.full_name}</b> <span className="tag">{u.role}</span><div className="muted">{u.email}, {u.phone}</div></div>
              <div className="row">
                <button onClick={() => { setEditing(u.id); setErrors({}); setForm({ fullName: u.full_name, email: u.email, phone: u.phone, address: u.address || '' }); }}>Изменить</button>
                {u.role !== 'admin' && <button className="danger" onClick={() => run(() => api(`/admin/users/${u.id}`, { method: 'DELETE' }), setError, list.reload, `Удалить пользователя ${u.full_name}?`)}>Удалить</button>}
              </div>
            </div>
          )}
        </div>
      ))}
    </State>
  );
}

const TABS = { Услуги: ServicesTab, Категории: CategoriesTab, Заказы: OrdersTab, Отзывы: ReviewsTab, Пользователи: UsersTab };

export default function Admin() {
  const [tab, setTab] = useState('Услуги');
  const Current = TABS[tab];
  return (
    <>
      <h1>Админ-панель</h1>
      <div className="tabs">
        {Object.keys(TABS).map((t) => <button key={t} className={t === tab ? 'primary' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <Current />
    </>
  );
}
