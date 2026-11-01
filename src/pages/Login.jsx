import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Field, ErrorBox } from '../components/Ui.jsx';
import { emailRe } from '../api.js';

export default function Login() {
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = 'Введите email';
    else if (!emailRe.test(form.email.trim())) e.email = 'Некорректный email';
    if (!form.password) e.password = 'Введите пароль';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e); setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await authenticate('/auth/login', { email: form.email.trim(), password: form.password });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="card narrow" onSubmit={submit} noValidate>
      <h2>Вход</h2>
      <ErrorBox message={serverError} />
      <Field label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Field label="Пароль" type="password" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="primary" disabled={busy}>{busy ? 'Входим...' : 'Войти'}</button>
      <p className="muted"><Link to="/forgot">Забыли пароль?</Link></p>
      <p className="muted">Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link></p>
    </form>
  );
}
