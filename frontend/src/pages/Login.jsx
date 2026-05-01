import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { errMessage } from "../api/http.js";

const REM_KEY = "recuerdame_username";

export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/home";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = localStorage.getItem(REM_KEY);
    if (prev) {
      setUsername(prev);
      setRemember(true);
    }
  }, []);

  if (session) return <Navigate to={from.startsWith("/") ? from : `/${from}`} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Los datos usuario y contraseña son requeridos.");
      return;
    }

    try {
      setBusy(true);
      await login(username.trim(), password);
      if (remember) localStorage.setItem(REM_KEY, username.trim());
      else localStorage.removeItem(REM_KEY);

      let dest = "/home";
      if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) dest = from;
      navigate(dest, { replace: true });
    } catch (err) {
      try {
        setError(errMessage(err));
      } catch {
        setError("Ha ocurrido un inconveniente con la transacción.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-5">
      <h1 className="login-outer-heading mb-4 px-3">Login</h1>
      <div className="d-flex justify-content-center px-3">
        <div className="card card-auth shadow-sm w-100">
          <div className="card-body p-4 p-md-5">
            <h2 className="h5 mb-4 text-secondary">Iniciar Sesión</h2>

            {error ? (
              <div className="alert alert-danger py-2 mb-4" role="alert">
                {error}
              </div>
            ) : null}

            <form noValidate onSubmit={onSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="usuario">
                  Usuario *
                </label>
                <input
                  id="usuario"
                  className="form-control rounded-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="clave">
                  Contraseña *
                </label>
                <div className="input-group">
                  <input
                    id="clave"
                    type={showPw ? "text" : "password"}
                    className="form-control rounded-start-3"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                </div>
              </div>

              <div className="form-check mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="rec"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="rec">
                  Recuérdame
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary w-100 text-uppercase fw-semibold py-2 rounded-3 btn-corp-primary text-white bg-primary"
              >
                {busy ? "…" : "INICIAR SESIÓN"}
              </button>
            </form>

            <p className="text-center mt-4 mb-0">
              <Link to="/registro" className="text-decoration-none small">
                ¿No tiene una cuenta? Regístrese
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
