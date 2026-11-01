import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api, money, todayStr } from '../api.js';
import { State, ErrorBox, Field } from '../components/Ui.jsx';

export default function Cart() {
  const { user } = useAuth();
  const { items, loading, error, reload, setQty, remove } = useCart();
  const [form, setForm] = useState({ address: user?.address || '', deliveryDate: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = items.reduce((s, i) => s + i.total, 0);

  async function change(fn) {
    setServerError('');
    try { await fn(); } catch (e) { setServerError(e.message); }
  }

  function validate() {
    const e = {};
    if (form.address.trim().length < 5) e.address = 'Введите адрес (минимум 5 символов)';
    if (!form.deliveryDate) e.deliveryDate = 'Выберите дату';
    else if (form.deliveryDate < todayStr()) e.deliveryDate = 'Дата не может быть раньше сегодняшней';
    return e;
  }

  async function checkout(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e); setServerError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api('/orders', { method: 'POST', body: form });
      await reload();
      setDone(true);
    } catch (err) {
      setServerError(err.message);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="card narrow">
        <h2>Заказ оформлен</h2>
        <p>Спасибо! Статус заказа можно отслеживать в личном кабинете.</p>
        <Link className="primary btn" to="/profile">Перейти к заказам</Link>
      </div>
    );
  }

  return (
    <>
      <h1>Корзина</h1>
      <State loading={loading && items.length === 0} error={error} onRetry={reload}>
        {items.length === 0 ? (
          <div className="card">
            <p>Корзина пуста.</p>
            <Link to="/">Выбрать услуги в каталоге</Link>
          </div>
        ) : (
          <>
            <ErrorBox message={serverError} />
            <div className="card">
              {items.map((i) => (
                <div className="cart-row" key={i.id}>
                  <div>
                    <b>{i.title}</b>
                    <div className="muted">{i.category}, {i.duration_minutes} мин, {money(i.price)}</div>
                  </div>
                  <div className="qty">
                    <button disabled={i.quantity <= 1} onClick={() => change(() => setQty(i.id, i.quantity - 1))}>−</button>
                    <span>{i.quantity}</span>
                    <button disabled={i.quantity >= 20} onClick={() => change(() => setQty(i.id, i.quantity + 1))}>+</button>
                  </div>
                  <b>{money(i.total)}</b>
                  <button className="danger" onClick={() => change(() => remove(i.id))}>Удалить</button>
                </div>
              ))}
              <h3 className="right">Итого: {money(total)}</h3>
            </div>
            <form className="card narrow" onSubmit={checkout} noValidate>
              <h3>Оформление заказа</h3>
              <Field label="Адрес" value={form.address} error={errors.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Field label="Дата" type="date" min={todayStr()} value={form.deliveryDate} error={errors.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
              <button className="primary" disabled={busy}>{busy ? 'Оформляем...' : 'Оформить заказ'}</button>
            </form>
          </>
        )}
      </State>
    </>
  );
}
