import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = session?.username || "Usuario";

  async function salir() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="app-headerbar py-3 px-3">
        <div className="d-flex justify-content-between align-items-center px-2 w-100">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-link text-white p-0 d-lg-none"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menú lateral"
            >
              <i className="bi bi-list fs-3 lh-1" />
            </button>
            <span className="fw-bold fs-6 text-uppercase mb-0">COMPANIA PRUEBA</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="small d-none d-sm-inline">{displayName}</span>
            <button
              type="button"
              className="btn btn-link text-white text-decoration-none p-0"
              onClick={() => salir()}
              aria-label="Cerrar sesión"
            >
              <i className="bi bi-box-arrow-right fs-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="d-flex flex-grow-1 position-relative">
        {sidebarOpen ? (
          <button
            type="button"
            className="d-lg-none position-fixed top-0 start-0 w-100 h-100 border-0 p-0 m-0"
            style={{
              zIndex: 1028,
              background: "rgba(0, 0, 0, 0.35)",
            }}
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`sidebar p-4 ${sidebarOpen ? "d-block position-fixed start-0" : "d-none d-lg-block"}`}
          style={{
            width: "280px",
            zIndex: sidebarOpen ? 1030 : 1,
            top: sidebarOpen ? 0 : undefined,
            minHeight: "calc(100vh - 72px)",
            height: sidebarOpen ? "100%" : undefined,
          }}
        >
          <div className="text-center mb-4">
            <div className="avatar-circle mx-auto mb-2">
              <i className="bi bi-person-fill" />
            </div>
            <div className="fw-semibold small">{displayName}</div>
          </div>

          <div className="menu-title text-muted mb-2 px-2">MENÚ</div>
          <nav className="nav flex-column gap-1" onClick={() => setSidebarOpen(false)}>
            <NavLink to="/home" className={navCls}>
              <span className="badge-prefix rounded-pill px-2 py-1 me-2 bg-white text-dark border">IN</span>
              <span>INICIO</span>
            </NavLink>
            <NavLink to="/clientes" className={navCls}>
              <span className="badge-prefix rounded-pill px-2 py-1 me-2 bg-white text-dark border">CC</span>
              <span>Consulta Clientes</span>
            </NavLink>
          </nav>
        </aside>

        <main className="flex-grow-1 content-area px-3 px-md-4 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function navCls({ isActive }) {
  const base = "nav-link d-flex align-items-center py-2 px-3 rounded text-decoration-none";
  const activeCls = "text-primary fw-semibold bg-white bg-opacity-50";
  const idleCls = "text-secondary";
  return `${base} ${isActive ? activeCls : idleCls}`;
}
