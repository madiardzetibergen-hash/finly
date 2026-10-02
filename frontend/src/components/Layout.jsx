import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  CircleDollarSign,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Tags,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { to: "/expenses", label: "Расходы", icon: TrendingDown },
  { to: "/income", label: "Доходы", icon: TrendingUp },
  { to: "/categories", label: "Категории", icon: Tags },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <strong>FinTrack</strong>
            <span>личные финансы</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Меню</div>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || <UserRound size={17} />}
            </div>
            <div className="user-mini-info">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="topbar-title">
            <span>Финансовый помощник</span>
          </div>
          <div className="topbar-user">
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || <UserRound size={17} />}
            </div>
            <span>{user?.name}</span>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}