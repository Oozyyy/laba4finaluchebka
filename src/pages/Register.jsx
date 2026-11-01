import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Field, ErrorBox } from '../components/Ui.jsx';
import { emailRe, phoneRe } from '../api.js';

export default function Register() {
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    const e = {};
    const name = form.fullName.trim();
    if (!name) e.fullName = 'Введите полное имя';
    else if (name.length < 2 || !/[A-Za-zА-Яа-яЁё]/.test(name)) e.fullName = 'Имя должно содержать минимум 2 символа и буквы';
    if (!form.email.trim()) e.email = 'Введите email';
    else if (!emailRe.test(form.email.trim())) e.email = 'Некорректный email';
    if (!form.phone.trim()) e.phone = 'Введите телефон';
    else if (!phoneRe.test(form.phone.trim())) e.phone = 'Некорректный телефон, пример: +7 999 123-45-67';
    if (!form.password) e.password = 'Введите пароль';
    else if (form.password.length < 6) e.password = 'Пароль должен быть не короче 6 символов';
    if (form.confirm !== form.password) e.confirm = 'Пароли не совпадают';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e); setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await authenticate('/auth/register', { fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="card narrow" onSubmit={submit} noValidate>
      <h2>Регистрация</h2>
      <ErrorBox message={serverError} />
      <Field label="Полное имя" value={form.fullName} error={errors.fullName} onChange={set('fullName')} />
      <Field label="Email" type="email" value={form.email} error={errors.email} onChange={set('email')} />
      <Field label="Телефон" type="tel" value={form.phone} error={errors.phone} onChange={set('phone')} />
      <Field label="Пароль" type="password" value={form.password} error={errors.password} onChange={set('password')} />
      <Field label="Повторите пароль" type="password" value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
      <button className="primary" disabled={busy}>{busy ? 'Создаём...' : 'Зарегистрироваться'}</button>
      <p className="muted">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </form>
  );
}
