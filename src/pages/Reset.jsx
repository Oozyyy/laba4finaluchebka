import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Field, ErrorBox } from '../components/Ui.jsx';

export default function Reset() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev) {
    ev.preventDefault();
    const e = {};
    if (form.password.length < 6) e.password = 'Пароль должен быть не короче 6 символов';
    if (form.confirm !== form.password) e.confirm = 'Пароли не совпадают';
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api('/auth/reset', { method: 'POST', body: { token, password: form.password } });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="card narrow" onSubmit={submit} noValidate>
      <h2>Новый пароль</h2>
      <ErrorBox message={error} />
      <Field label="Новый пароль" type="password" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Field label="Повторите пароль" type="password" value={form.confirm} error={errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <button className="primary" disabled={busy}>{busy ? 'Сохраняем...' : 'Сохранить пароль'}</button>
      <p className="muted"><Link to="/forgot">Запросить новую ссылку</Link></p>
    </form>
  );
}
