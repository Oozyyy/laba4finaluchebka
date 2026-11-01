import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { api, money, emailRe, phoneRe } from '../api.js';
import { State, ErrorBox, Field } from '../components/Ui.jsx';

function InfoForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, phone: user.phone, address: user.address || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(ev) {
    ev.preventDefault();
    const e = {};
    if (form.fullName.trim().length < 2 || !/[A-Za-zА-Яа-яЁё]/.test(form.fullName)) e.fullName = 'Введите корректное имя';
    if (!emailRe.test(form.email.trim())) e.email = 'Некорректный email';
    if (!phoneRe.test(form.phone.trim())) e.phone = 'Некорректный телефон';
    if (form.address.length > 200) e.address = 'Адрес не длиннее 200 символов';
    setErrors(e); setError(''); setOk('');
    if (Object.keys(e).length) return;
    try {
      setUser(await api('/me', { method: 'PUT', body: form }));
      setOk('Данные сохранены');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Личная информация</h3>
      <ErrorBox message={error} />
      {ok && <div className="success">{ok}</div>}
      <Field label="ФИО" value={form.fullName} error={errors.fullName} onChange={set('fullName')} />
      <Field label="Email" type="email" value={form.email} error={errors.email} onChange={set('email')} />
      <Field label="Телефон" value={form.phone} error={errors.phone} onChange={set('phone')} />
      <Field label="Адрес по умолчанию" value={form.address} error={errors.address} onChange={set('address')} />
      <button className="primary">Сохранить</button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function submit(ev) {
    ev.preventDefault();
    const e = {};
    if (!form.oldPassword) e.oldPassword = 'Введите текущий пароль';
    if (form.newPassword.length < 6) e.newPassword = 'Минимум 6 символов';
    else if (form.newPassword === form.oldPassword) e.newPassword = 'Новый пароль должен отличаться от текущего';
    if (form.confirm !== form.newPassword) e.confirm = 'Пароли не совпадают';
    setErrors(e); setError(''); setOk('');
    if (Object.keys(e).length) return;
    try {
      await api('/me/password', { method: 'PUT', body: { oldPassword: form.oldPassword, newPassword: form.newPassword } });
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
      setOk('Пароль изменён');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Смена пароля</h3>
      <ErrorBox message={error} />
      {ok && <div className="success">{ok}</div>}
      <Field label="Текущий пароль" type="password" value={form.oldPassword} error={errors.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} />
      <Field label="Новый пароль" type="password" value={form.newPassword} error={errors.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
      <Field label="Повторите новый пароль" type="password" value={form.confirm} error={errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <button className="primary">Изменить пароль</button>
    </form>
  );
}

function Orders() {
  const { data, loading, error, reload } = useFetch('/me/orders');
  return (
    <div className="card">
      <h3>Мои заказы</h3>
      <State loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 && <p className="muted">Заказов пока нет.</p>}
        {data && data.map((o) => (
          <div className="order" key={o.id}>
            <div className="row">
              <b>Доставка: {o.delivery_date}</b>
              <span className="tag">{o.status}</span>
            </div>
            <div className="muted">Адрес: {o.address}</div>
            <ul>{o.items.map((i, n) => <li key={n}>{i.title} × {i.quantity} — {money(i.price * i.quantity)}</li>)}</ul>
            <b>Итого: {money(o.total)}</b>
          </div>
        ))}
      </State>
    </div>
  );
}

export default function Profile() {
  return (
    <>
      <h1>Личный кабинет</h1>
      <Orders />
      <div className="two">
        <InfoForm />
        <PasswordForm />
      </div>
    </>
  );
}
