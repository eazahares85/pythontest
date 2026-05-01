import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, errMessage } from "../api/http.js";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const PW_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{9,20}$/;

export default function Register() {
  const { session } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const pwHint = useMemo(
    () => "La contraseña debe tener entre 9 y 20 caracteres e incluir mayúscula, minúscula y números.",
    []
  );

  if (session) return <Navigate to="/home" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim() || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Ingrese una dirección de correo válida.");
      return;
    }
    if (!PW_RE.test(password)) {
      setError(pwHint);
      return;
    }

    try {
      setBusy(true);
      const resp = await apiFetch("/api/auth/register", {
        skipAuth: true,
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      setSuccess(resp?.message || "Usuario creado correctamente");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-5">
      <h2 className="auth-page-title mb-5 text-primary text-center">Registro</h2>
      <div className="row justify-content-center px-3">
        <div className="col-12 col-md-10 col-lg-7 col-xl-5">
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="alert alert-success" role="alert">
              {success}
              <div className="mt-3">
                <Link to="/login" className="btn btn-outline-primary btn-sm">
                  Ir a iniciar sesión
                </Link>
              </div>
            </div>
          ) : null}

          <form className="vstack gap-3" noValidate onSubmit={onSubmit}>
            <input
              className="form-control rounded-3"
              placeholder="Nombre Usuario *"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={busy}
            />
            <input
              className="form-control rounded-3"
              type="email"
              placeholder="Dirección de correo *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
            <input
              className="form-control rounded-3"
              type="password"
              placeholder="Contraseña *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={busy}
            />
            <small className="text-muted">{pwHint}</small>

            <button
              type="submit"
              className="btn btn-primary fw-semibold text-uppercase py-3 mt-4 rounded-3"
              disabled={busy}
            >
              Registrarme
            </button>
          </form>

          <p className="text-center mt-4">
            <Link to="/login" className="text-decoration-none small">
              ¿Ya tiene cuenta? Inicie sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
