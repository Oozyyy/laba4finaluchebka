import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, emailRe } from '../api.js';
import { Field, ErrorBox } from '../components/Ui.jsx';

// Восстановление пароля: запрашиваем ссылку для сброса
export default function Forgot() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev) {
    ev.preventDefault();
    setError(''); setFieldError('');
    if (!emailRe.test(email.trim())) return setFieldError('Введите корректный email');
    setBusy(true);
    try {
      const r = await api('/auth/forgot', { method: 'POST', body: { email } });
      setToken(r.token);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (token) {
    return (
      <div className="card narrow">
        <h2>Ссылка для сброса создана</h2>
        <p>В реальной системе она пришла бы на почту. В учебной версии перейдите по ссылке ниже (действует 30 минут).</p>
        <Link className="primary btn" to={'/reset/' + token}>Задать новый пароль</Link>
      </div>
    );
  }

  return (
    <form className="card narrow" onSubmit={submit} noValidate>
      <h2>Восстановление пароля</h2>
      <p className="muted">Укажите email, с которым вы регистрировались.</p>
      <ErrorBox message={error} />
      <Field label="Email" type="email" value={email} error={fieldError} onChange={(e) => setEmail(e.target.value)} />
      <button className="primary" disabled={busy}>{busy ? 'Отправляем...' : 'Получить ссылку'}</button>
      <p className="muted"><Link to="/login">Вернуться ко входу</Link></p>
    </form>
  );
}
