import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((s, i) => s + i.quantity, 0);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="logo">ЧистоДом</NavLink>
        <nav>
          <NavLink to="/" end>Каталог</NavLink>
          {user && <NavLink to="/cart">Корзина{count > 0 && <span className="badge">{count}</span>}</NavLink>}
          {user && <NavLink to="/profile">Личный кабинет</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Админ-панель</NavLink>}
        </nav>
        <div className="nav-right">
          {user ? (
            <>
              <span className="muted">{user.fullName}</span>
              <button onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Войти</NavLink>
              <NavLink to="/register">Регистрация</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
