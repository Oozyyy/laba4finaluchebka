import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const db = new DatabaseSync('chistodom.db');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  role_id INTEGER NOT NULL REFERENCES roles(id)
);
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price REAL NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, service_id)
);
CREATE TABLE IF NOT EXISTS order_statuses (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  status_id INTEGER NOT NULL REFERENCES order_statuses(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, service_id)
);
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL
);
`);


if (db.prepare('SELECT COUNT(*) c FROM roles').get().c === 0) {
  db.prepare('INSERT INTO roles (name) VALUES (?)').run('admin');
  db.prepare('INSERT INTO roles (name) VALUES (?)').run('user');
  for (const s of ['Новый', 'Подтверждён', 'Выполняется', 'Выполнен', 'Отменён']) {
    db.prepare('INSERT INTO order_statuses (name) VALUES (?)').run(s);
  }
  for (const c of ['Уборка квартир', 'Химчистка', 'Мытьё окон', 'После ремонта']) {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run(c);
  }
  const cat = (n) => db.prepare('SELECT id FROM categories WHERE name=?').get(n).id;
  const ins = db.prepare('INSERT INTO services (title, description, duration_minutes, price, category_id) VALUES (?,?,?,?,?)');
  ins.run('Поддерживающая уборка', 'Влажная уборка всех комнат, пыль, полы, санузел', 120, 2500, cat('Уборка квартир'));
  ins.run('Генеральная уборка', 'Глубокая уборка с мытьём труднодоступных мест и техники', 300, 6500, cat('Уборка квартир'));
  ins.run('Химчистка дивана', 'Глубокая чистка обивки мебели экстракторным методом', 90, 3200, cat('Химчистка'));
  ins.run('Химчистка ковра', 'Чистка ковров с удалением пятен и запахов', 60, 1800, cat('Химчистка'));
  ins.run('Мытьё окон', 'Мытьё стёкол, рам и подоконников с двух сторон', 90, 1500, cat('Мытьё окон'));
  ins.run('Мытьё панорамных окон', 'Мытьё больших стеклянных поверхностей и балконов', 150, 4200, cat('Мытьё окон'));
  ins.run('Уборка после ремонта', 'Вывоз мелкого мусора, удаление строительной пыли и следов', 360, 9000, cat('После ремонта'));
  const roleId = (n) => db.prepare('SELECT id FROM roles WHERE name=?').get(n).id;
  db.prepare('INSERT INTO users (full_name,email,password_hash,phone,address,role_id) VALUES (?,?,?,?,?,?)')
    .run('Администратор', 'admin@chistodom.ru', bcrypt.hashSync('admin123', 10), '+79990000000', '', roleId('admin'));
}

export default db;
