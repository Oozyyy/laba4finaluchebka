import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express();
app.use(cors());
app.use(express.json());

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRe = /^\+?[0-9\s\-()]{10,18}$/;
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });


function validateUser({ fullName, email, phone, address }, { partial = false } = {}) {
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) return 'Полное имя: от 2 до 100 символов';
  if (!/[A-Za-zА-Яа-яЁё]/.test(fullName)) return 'Полное имя должно содержать буквы';
  if (typeof email !== 'string' || !emailRe.test(email.trim())) return 'Некорректный email';
  if (typeof phone !== 'string' || !phoneRe.test(phone.trim())) return 'Некорректный телефон (10-18 цифр, можно + и пробелы)';
  if (address !== undefined && address !== null && (typeof address !== 'string' || address.length > 200)) return 'Адрес не длиннее 200 символов';
  return null;
}
const validPassword = (p) => typeof p === 'string' && p.length >= 6 && p.length <= 64;


function auth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    const { id } = jwt.verify(h.replace('Bearer ', ''), SECRET);
    const u = db.prepare(`SELECT u.id, u.full_name, u.email, u.phone, u.address, r.name AS role
      FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(id);
    if (!u) return bad(res, 'Пользователь не найден', 401);
    req.user = u;
    next();
  } catch {
    bad(res, 'Требуется авторизация', 401);
  }
}
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : bad(res, 'Недостаточно прав', 403));
const publicUser = (u) => ({ fullName: u.full_name, email: u.email, phone: u.phone, address: u.address, role: u.role });
const makeToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '7d' });
const roleId = (n) => db.prepare('SELECT id FROM roles WHERE name=?').get(n).id;


app.post('/api/auth/register', (req, res) => {
  const err = validateUser(req.body);
  if (err) return bad(res, err);
  if (!validPassword(req.body.password)) return bad(res, 'Пароль: от 6 до 64 символов');
  const email = req.body.email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return bad(res, 'Пользователь с таким email уже существует', 409);
  const r = db.prepare('INSERT INTO users (full_name,email,password_hash,phone,role_id) VALUES (?,?,?,?,?)')
    .run(req.body.fullName.trim(), email, bcrypt.hashSync(req.body.password, 10), req.body.phone.trim(), roleId('user'));
  res.status(201).json({ token: makeToken(r.lastInsertRowid) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return bad(res, 'Введите email и пароль');
  const u = db.prepare('SELECT id, password_hash FROM users WHERE email=?').get(String(email).trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(password), u.password_hash)) return bad(res, 'Неверный email или пароль', 401);
  res.json({ token: makeToken(u.id) });
});

app.post('/api/auth/forgot', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailRe.test(email)) return bad(res, 'Введите корректный email');
  const u = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!u) return bad(res, 'Пользователь с таким email не найден', 404);
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare('DELETE FROM password_resets WHERE user_id=?').run(u.id);
  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)').run(u.id, token, Date.now() + 30 * 60 * 1000);
  res.json({ token });
});

app.post('/api/auth/reset', (req, res) => {
  const { token, password } = req.body;
  if (!validPassword(password)) return bad(res, 'Пароль: от 6 до 64 символов');
  const r = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token=?').get(String(token || ''));
  if (!r || r.expires_at < Date.now()) return bad(res, 'Ссылка недействительна или устарела');
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), r.user_id);
  db.prepare('DELETE FROM password_resets WHERE user_id=?').run(r.user_id);
  res.json({ ok: true });
});


app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

app.put('/api/me', auth, (req, res) => {
  const err = validateUser(req.body);
  if (err) return bad(res, err);
  const email = req.body.email.trim().toLowerCase();
  const dup = db.prepare('SELECT 1 FROM users WHERE email=? AND id<>?').get(email, req.user.id);
  if (dup) return bad(res, 'Этот email уже занят', 409);
  db.prepare('UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=?')
    .run(req.body.fullName.trim(), email, req.body.phone.trim(), (req.body.address || '').trim(), req.user.id);
  const u = db.prepare('SELECT u.full_name,u.email,u.phone,u.address,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?').get(req.user.id);
  res.json(publicUser(u));
});

app.put('/api/me/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const row = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(String(oldPassword || ''), row.password_hash)) return bad(res, 'Текущий пароль указан неверно');
  if (!validPassword(newPassword)) return bad(res, 'Новый пароль: от 6 до 64 символов');
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

app.get('/api/me/orders', auth, (req, res) => res.json(loadOrders('WHERE o.user_id = ?', [req.user.id])));

function loadOrders(where = '', params = []) {
  const orders = db.prepare(`SELECT o.id, o.address, o.delivery_date, o.created_at, st.name AS status,
      u.full_name AS customer, u.email AS customer_email
    FROM orders o JOIN order_statuses st ON st.id=o.status_id JOIN users u ON u.id=o.user_id
    ${where} ORDER BY o.id DESC`).all(...params);
  const items = db.prepare('SELECT title, quantity, price FROM order_items WHERE order_id=?');
  return orders.map((o) => {
    const list = items.all(o.id);
    return { ...o, items: list, total: list.reduce((s, i) => s + i.price * i.quantity, 0) };
  });
}

app.get('/api/categories', (req, res) => res.json(db.prepare('SELECT id, name FROM categories ORDER BY name').all()));

app.get('/api/services', (req, res) => {
  const category = req.query.category ? String(req.query.category) : null;
  const min = Number(req.query.min);
  const max = Number(req.query.max);
  const rows = db.prepare(`SELECT s.id, s.title, s.description, s.duration_minutes, s.price,
      c.name AS category, ROUND(AVG(r.rating),1) AS rating, COUNT(r.id) AS reviews_count
    FROM services s JOIN categories c ON c.id=s.category_id LEFT JOIN reviews r ON r.service_id=s.id
    WHERE (? IS NULL OR c.name=?) AND s.price>=? AND s.price<=?
    GROUP BY s.id ORDER BY s.title`)
    .all(category, category, Number.isFinite(min) && req.query.min !== '' ? min : 0, Number.isFinite(max) && req.query.max !== '' ? max : 1e12);
  res.json(rows);
});

app.get('/api/services/:id/reviews', (req, res) => {
  res.json(db.prepare(`SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS author
    FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.service_id=? ORDER BY r.id DESC`).all(req.params.id));
});

app.post('/api/services/:id/reviews', auth, (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, 'Оценка от 1 до 5');
  if (comment.length < 3 || comment.length > 1000) return bad(res, 'Комментарий: от 3 до 1000 символов');
  if (!db.prepare('SELECT 1 FROM services WHERE id=?').get(req.params.id)) return bad(res, 'Услуга не найдена', 404);
  if (db.prepare('SELECT 1 FROM reviews WHERE user_id=? AND service_id=?').get(req.user.id, req.params.id)) return bad(res, 'Вы уже оставили отзыв на эту услугу', 409);
  db.prepare('INSERT INTO reviews (user_id, service_id, rating, comment) VALUES (?,?,?,?)').run(req.user.id, req.params.id, rating, comment);
  res.status(201).json({ ok: true });
});

function cartOf(userId) {
  return db.prepare(`SELECT ci.id, ci.quantity, s.title, s.price, s.duration_minutes, c.name AS category,
      ci.quantity * s.price AS total
    FROM cart_items ci JOIN services s ON s.id=ci.service_id JOIN categories c ON c.id=s.category_id
    WHERE ci.user_id=? ORDER BY ci.id`).all(userId);
}
app.get('/api/cart', auth, (req, res) => res.json(cartOf(req.user.id)));

app.post('/api/cart', auth, (req, res) => {
  if (!db.prepare('SELECT 1 FROM services WHERE id=?').get(req.body.serviceId)) return bad(res, 'Услуга не найдена', 404);
  db.prepare(`INSERT INTO cart_items (user_id, service_id, quantity) VALUES (?,?,1)
    ON CONFLICT(user_id, service_id) DO UPDATE SET quantity = MIN(quantity + 1, 20)`).run(req.user.id, req.body.serviceId);
  res.status(201).json(cartOf(req.user.id));
});

app.patch('/api/cart/:id', auth, (req, res) => {
  const q = Number(req.body.quantity);
  if (!Number.isInteger(q) || q < 1 || q > 20) return bad(res, 'Количество от 1 до 20');
  const r = db.prepare('UPDATE cart_items SET quantity=? WHERE id=? AND user_id=?').run(q, req.params.id, req.user.id);
  if (!r.changes) return bad(res, 'Позиция не найдена', 404);
  res.json(cartOf(req.user.id));
});

app.delete('/api/cart/:id', auth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json(cartOf(req.user.id));
});

app.post('/api/orders', auth, (req, res) => {
  const address = String(req.body.address || '').trim();
  const date = String(req.body.deliveryDate || '');
  if (address.length < 5 || address.length > 200) return bad(res, 'Адрес: от 5 до 200 символов');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return bad(res, 'Некорректная дата');
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return bad(res, 'Дата не может быть раньше сегодняшней');
  const cart = cartOf(req.user.id);
  if (!cart.length) return bad(res, 'Корзина пуста');
  db.exec('BEGIN');
  try {
    const status = db.prepare("SELECT id FROM order_statuses WHERE name='Новый'").get().id;
    const o = db.prepare('INSERT INTO orders (user_id,address,delivery_date,status_id) VALUES (?,?,?,?)').run(req.user.id, address, date, status);
    const ins = db.prepare('INSERT INTO order_items (order_id,service_id,title,quantity,price) VALUES (?,?,?,?,?)');
    for (const i of db.prepare('SELECT ci.quantity, s.id, s.title, s.price FROM cart_items ci JOIN services s ON s.id=ci.service_id WHERE ci.user_id=?').all(req.user.id)) {
      ins.run(o.lastInsertRowid, i.id, i.title, i.quantity, i.price);
    }
    db.prepare('DELETE FROM cart_items WHERE user_id=?').run(req.user.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return bad(res, 'Не удалось оформить заказ', 500);
  }
  res.status(201).json({ ok: true });
});

const admin = express.Router();
app.use('/api/admin', auth, adminOnly, admin);

function validService(b) {
  if (String(b.title || '').trim().length < 2) return 'Название: минимум 2 символа';
  if (String(b.description || '').trim().length < 5) return 'Описание: минимум 5 символов';
  if (!Number.isInteger(Number(b.duration)) || Number(b.duration) < 1 || Number(b.duration) > 1440) return 'Длительность: от 1 до 1440 минут';
  if (!(Number(b.price) > 0) || Number(b.price) > 10000000) return 'Цена должна быть положительной';
  if (!db.prepare('SELECT 1 FROM categories WHERE id=?').get(b.categoryId)) return 'Выберите категорию';
  return null;
}
admin.post('/services', (req, res) => {
  const e = validService(req.body); if (e) return bad(res, e);
  db.prepare('INSERT INTO services (title,description,duration_minutes,price,category_id) VALUES (?,?,?,?,?)')
    .run(req.body.title.trim(), req.body.description.trim(), Number(req.body.duration), Number(req.body.price), req.body.categoryId);
  res.status(201).json({ ok: true });
});
admin.put('/services/:id', (req, res) => {
  const e = validService(req.body); if (e) return bad(res, e);
  const r = db.prepare('UPDATE services SET title=?,description=?,duration_minutes=?,price=?,category_id=? WHERE id=?')
    .run(req.body.title.trim(), req.body.description.trim(), Number(req.body.duration), Number(req.body.price), req.body.categoryId, req.params.id);
  r.changes ? res.json({ ok: true }) : bad(res, 'Не найдено', 404);
});
admin.delete('/services/:id', (req, res) => { db.prepare('DELETE FROM services WHERE id=?').run(req.params.id); res.json({ ok: true }); });

admin.post('/categories', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 60) return bad(res, 'Название: от 2 до 60 символов');
  if (db.prepare('SELECT 1 FROM categories WHERE name=?').get(name)) return bad(res, 'Такая категория уже есть', 409);
  db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  res.status(201).json({ ok: true });
});
admin.put('/categories/:id', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 60) return bad(res, 'Название: от 2 до 60 символов');
  if (db.prepare('SELECT 1 FROM categories WHERE name=? AND id<>?').get(name, req.params.id)) return bad(res, 'Такая категория уже есть', 409);
  db.prepare('UPDATE categories SET name=? WHERE id=?').run(name, req.params.id);
  res.json({ ok: true });
});
admin.delete('/categories/:id', (req, res) => {
  if (db.prepare('SELECT 1 FROM services WHERE category_id=?').get(req.params.id)) return bad(res, 'Нельзя удалить категорию, в которой есть услуги', 409);
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

admin.get('/orders', (req, res) => res.json(loadOrders()));
admin.get('/statuses', (req, res) => res.json(db.prepare('SELECT name FROM order_statuses ORDER BY id').all()));
admin.put('/orders/:id', (req, res) => {
  const st = db.prepare('SELECT id FROM order_statuses WHERE name=?').get(String(req.body.status || ''));
  if (!st) return bad(res, 'Неизвестный статус');
  const r = db.prepare('UPDATE orders SET status_id=? WHERE id=?').run(st.id, req.params.id);
  r.changes ? res.json({ ok: true }) : bad(res, 'Не найдено', 404);
});
admin.delete('/orders/:id', (req, res) => { db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id); res.json({ ok: true }); });

admin.get('/reviews', (req, res) => res.json(db.prepare(`SELECT r.id, r.rating, r.comment, u.full_name AS author, s.title AS service
  FROM reviews r JOIN users u ON u.id=r.user_id JOIN services s ON s.id=r.service_id ORDER BY r.id DESC`).all()));
admin.put('/reviews/:id', (req, res) => {
  const rating = Number(req.body.rating); const comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, 'Оценка от 1 до 5');
  if (comment.length < 3 || comment.length > 1000) return bad(res, 'Комментарий: от 3 до 1000 символов');
  db.prepare('UPDATE reviews SET rating=?, comment=? WHERE id=?').run(rating, comment, req.params.id);
  res.json({ ok: true });
});
admin.delete('/reviews/:id', (req, res) => { db.prepare('DELETE FROM reviews WHERE id=?').run(req.params.id); res.json({ ok: true }); });

admin.get('/users', (req, res) => res.json(db.prepare(`SELECT u.id, u.full_name, u.email, u.phone, u.address, r.name AS role
  FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id`).all()));
admin.put('/users/:id', (req, res) => {
  const e = validateUser(req.body); if (e) return bad(res, e);
  const email = req.body.email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email=? AND id<>?').get(email, req.params.id)) return bad(res, 'Этот email уже занят', 409);
  db.prepare('UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=?')
    .run(req.body.fullName.trim(), email, req.body.phone.trim(), (req.body.address || '').trim(), req.params.id);
  res.json({ ok: true });
});
admin.delete('/users/:id', (req, res) => {
  const u = db.prepare('SELECT r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?').get(req.params.id);
  if (!u) return bad(res, 'Не найдено', 404);
  if (u.role === 'admin') return bad(res, 'Нельзя удалить администратора', 403);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.use('/api', (req, res) => bad(res, 'Маршрут не найден', 404));
app.listen(4000, () => console.log('API: http://localhost:4000'));
