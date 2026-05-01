import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch, errMessage } from "../api/http.js";

export default function ConsultaClientes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nombre, setNombre] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const f = location.state?.flash;
    if (typeof f === "string" && f.trim())
      setSuccess(f);
  }, [location.state]);

  async function buscar() {
    setError("");
    setSuccess("");
    try {
      setBusy(true);
      const data = await apiFetch("/api/clientes/listado", {
        method: "POST",
        body: JSON.stringify({ nombre, identificacion }),
      });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
    } catch (e) {
      setRows([]);
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmarEliminar() {
    const id = pendingDelete?.id;
    if (!id) return;
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/clientes/${encodeURIComponent(id)}`, { method: "DELETE" });
      setPendingDelete(null);
      setSuccess("Cliente eliminado correctamente.");
      await buscar();
    } catch (e) {
      setError(errMessage(e));
    }
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-3 p-lg-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">Consulta de clientes</h1>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/clientes/mantenimiento")}
            >
              <i className="bi bi-plus-lg me-1" />
              Agregar
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/home")}>
              <i className="bi bi-arrow-left me-1" />
              Regresar
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="alert alert-success py-2" role="alert">
            {success}
          </div>
        ) : null}

        <div className="row g-2 align-items-center mb-4">
          <div className="col-12 col-md-5 col-lg-4">
            <input
              type="text"
              className="form-control rounded-3"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-5 col-lg-4">
            <input
              type="text"
              className="form-control rounded-3"
              placeholder="Identificación"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-primary rounded-circle p-3"
              onClick={() => buscar()}
              aria-label="Buscar"
              disabled={busy}
            >
              <i className="bi bi-search fs-6" />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle table-head-corp">
            <thead>
              <tr>
                <th>Identificación</th>
                <th>Nombre completo</th>
                <th className="text-center" style={{ width: "140px" }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="text-muted text-center small" colSpan={3}>
                    {busy ? "Buscando…" : 'Use los filtros y la lupa para buscar registros.'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const full = `${r.nombre ?? ""} ${r.apellidos ?? ""}`.trim();
                  return (
                    <tr key={r.id}>
                      <td>{r.identificacion}</td>
                      <td>{full}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-link p-2 text-secondary"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => navigate(`/clientes/mantenimiento/${r.id}`)}
                        >
                          <i className="bi bi-pencil-square fs-5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link p-2 text-danger"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => setPendingDelete(r)}
                        >
                          <i className="bi bi-trash fs-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <div className={`modal fade ${pendingDelete ? "show d-block" : "d-none"}`} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h2 className="modal-title fs-6">Eliminar cliente</h2>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setPendingDelete(null)} />
              </div>
              <div className="modal-body pt-0">
                ¿Confirmar eliminación del registro seleccionado?
                {pendingDelete ? (
                  <div className="small text-muted mt-2">{pendingDelete.identificacion}</div>
                ) : null}
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPendingDelete(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => confirmarEliminar()}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
          {pendingDelete ? <div className="modal-backdrop fade show" /> : null}
        </div>
      </div>
    </div>
  );
}
