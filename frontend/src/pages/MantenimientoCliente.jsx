import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, errMessage } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";

function thumbSrcFromStored(img) {
  if (!img) return "";
  if (typeof img !== "string") return "";
  if (img.startsWith("data:")) return img;
  return `data:image/jpeg;base64,${img}`;
}

function isoToDateInput(val) {
  if (!val) return "";
  if (typeof val === "string" && val.length >= 10)
    try {
      return val.slice(0, 10);
    } catch {
      return "";
    }
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function toUtcIsoMidday(dateStr) {
  if (!dateStr) return "";
  const ms = Date.parse(`${dateStr}T12:00:00.000Z`);
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString();
}

function readFileAsBase64Prefix(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const res = String(fr.result || "");
        const parts = res.split(",", 2);
        resolve(parts.length > 1 ? parts[1] : res);
      } catch (e) {
        reject(e);
      }
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export default function MantenimientoCliente() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [intereses, setIntereses] = useState([]);

  const [clientId, setClientId] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [telCel, setTelCel] = useState("");
  const [telOtro, setTelOtro] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fNac, setFNac] = useState("");
  const [fAfil, setFAfil] = useState("");
  const [sexo, setSexo] = useState("M");
  const [resena, setResena] = useState("");
  const [interesId, setInteresId] = useState("");
  const [imagenB64, setImagenB64] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [thumb, setThumb] = useState("");

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const data = await apiFetch("/api/intereses");
        setIntereses(Array.isArray(data) ? data : []);
      } catch {
      }
    }
    cargarCatalogo();
  }, []);

  useEffect(() => {
    async function cargarCliente() {
      if (!id) return;
      setBusy(true);
      try {
        const c = await apiFetch(`/api/clientes/${encodeURIComponent(id)}`);

        setClientId(String(c.id || ""));
        setNombre(String(c.nombre ?? ""));
        setApellidos(String(c.apellidos ?? ""));
        setIdentificacion(String(c.identificacion ?? ""));
        setTelCel(String(c.telefonoCelular ?? ""));
        setTelOtro(String(c.otroTelefono ?? ""));
        setDireccion(String(c.direccion ?? ""));
        setFNac(isoToDateInput(c.fNacimiento ?? ""));
        setFAfil(isoToDateInput(c.fAfiliacion ?? ""));
        setSexo(String(c.sexo || "M").toUpperCase() === "F" ? "F" : "M");
        setResena(String(c.resenaPersonal ?? ""));
        setInteresId(String(c.interesesId ?? ""));
        const img = String(c.imagen ?? "");
        setImagenB64(img);
        setThumb(thumbSrcFromStored(img));
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setBusy(false);
      }
    }
    cargarCliente();
  }, [id]);

  const previewSrc = useMemo(() => thumb || "", [thumb]);

  async function pickImagen(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const b64 = await readFileAsBase64Prefix(f);
      setImagenB64(b64);
      const url = URL.createObjectURL(f);
      setThumb(url);
    } catch {
      setError("No se pudo leer la imagen.");
    }
  }

  function validar() {
    const camposTxt = [
      ["Nombre", nombre],
      ["Apellidos", apellidos],
      ["Identificación", identificacion],
      ["Teléfono Celular", telCel],
      ["Teléfono Otro", telOtro],
      ["Dirección", direccion],
      ["Fecha Nacimiento", fNac],
      ["Fecha Afiliación", fAfil],
      ["Sexo", sexo],
      ["Reseña", resena],
      ["Interés", interesId],
    ];
    for (const [k, v] of camposTxt) {
      const ok = typeof v === "string" ? v.trim() : v;
      if (!ok && k !== "Teléfono Otro") {
        setError(`${k} es obligatorio (*).`);
        return false;
      }
    }
    return true;
  }

  async function guardar(ev) {
    ev.preventDefault();
    setError("");
    if (!validar()) return;
    if (!session?.userid) {
      setError("Sesión inválida. Vuelva a iniciar sesión.");
      return;
    }

    try {
      setBusy(true);
      if (!isEdit) {
        const creado = await apiFetch("/api/clientes", {
          method: "POST",
          body: JSON.stringify({
            usuarioId: session.userid,
            nombre,
            apellidos,
            identificacion,
            celular: telCel,
            otroTelefono: telOtro,
            direccion,
            fNacimiento: toUtcIsoMidday(fNac),
            fAfiliacion: toUtcIsoMidday(fAfil),
            sexo,
            resennaPersonal: resena,
            imagen: imagenB64 || "",
            interesFK: interesId,
          }),
        });
        const idNuevo = String(creado?.id ?? "").trim();
        const respuestaInvalida = !creado || typeof creado !== "object";
        const altaRechazada =
          respuestaInvalida ||
          creado.exito === false ||
          !idNuevo ||
          idNuevo === "sin_id";
        if (altaRechazada) {
          let msg = "No se pudo confirmar la creación del cliente.";
          if (respuestaInvalida) msg = "Respuesta inválida del servidor.";
          else if (typeof creado.mensaje === "string" && creado.mensaje.trim())
            msg = creado.mensaje.trim();
          setError(msg);
          return;
        }
        const flashOk =
          typeof creado.mensaje === "string" && creado.mensaje.trim()
            ? creado.mensaje.trim()
            : "Cliente creado correctamente.";
        navigate("/clientes", {
          replace: false,
          state: { flash: flashOk, recargarListado: true, limpiarFiltros: true },
        });
        return;
      }
      await apiFetch("/api/clientes/actualizar", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: session.userid,
          id: clientId || id,
          nombre,
          apellidos,
          identificacion,
          celular: telCel,
          otroTelefono: telOtro,
          direccion,
          fNacimiento: toUtcIsoMidday(fNac),
          fAfiliacion: toUtcIsoMidday(fAfil),
          sexo,
          resennaPersonal: resena,
          imagen: imagenB64 || "",
          interesFK: interesId,
        }),
      });

      navigate("/clientes", { replace: false, state: { flash: "Operación realizada correctamente." } });
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-3 p-lg-4">
        <div className="d-flex flex-column flex-xl-row gap-4 justify-content-between align-items-start mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="position-relative rounded border bg-light ratio ratio-1x1" style={{ width: "72px", maxWidth: "25vw" }}>
              {previewSrc ? (
                <img src={previewSrc} alt="" className="rounded object-fit-cover" />
              ) : (
                <div className="d-flex justify-content-center align-items-center bg-secondary bg-opacity-10">
                  <i className="bi bi-images text-muted fs-5" />
                </div>
              )}
            </div>
            <h1 className="h5 mb-0 fw-bold d-flex align-items-center gap-2">
              Mantenimiento de clientes <i className="bi bi-person-badge text-muted" />
            </h1>
          </div>
          <div className="d-flex flex-wrap gap-2 ms-xl-auto">
            <button type="submit" form="maint-form" disabled={busy} className="btn btn-primary btn-sm">
              <i className="bi bi-floppy-fill me-1" /> Guardar
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate("/clientes")}
            >
              <i className="bi bi-arrow-left me-1" /> Regresar
            </button>
          </div>
        </div>

        <input id="maint-img-picker" type="file" accept="image/*" className="visually-hidden" onChange={(e) => pickImagen(e)} />
        <label className="btn btn-light btn-sm border mb-3" htmlFor="maint-img-picker">
          Elegir imagen (opcional)
        </label>

        {error ? (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        ) : null}

        <form id="maint-form" onSubmit={(e) => guardar(e)} noValidate className="vstack gap-3">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Identificación *</label>
              <input className="form-control" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Nombre *</label>
              <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={50} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Apellidos *</label>
              <input className="form-control" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Género *</label>
              <select className="form-select" value={sexo} onChange={(e) => setSexo(e.target.value)}>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Fecha de nacimiento *</label>
              <input type="date" className="form-control" value={fNac} onChange={(e) => setFNac(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Fecha de afiliación *</label>
              <input type="date" className="form-control" value={fAfil} onChange={(e) => setFAfil(e.target.value)} />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Teléfono Celular *</label>
              <input className="form-control" value={telCel} onChange={(e) => setTelCel(e.target.value)} maxLength={20} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Teléfono Otro *</label>
              <input className="form-control" value={telOtro} onChange={(e) => setTelOtro(e.target.value)} maxLength={20} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Interés *</label>
              <select className="form-select" value={interesId} onChange={(e) => setInteresId(e.target.value)}>
                <option value="">Seleccione</option>
                {intereses.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.descripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Dirección *</label>
            <input className="form-control" value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} />
          </div>

          <div>
            <label className="form-label">Reseña *</label>
            <textarea className="form-control" rows={3} value={resena} onChange={(e) => setResena(e.target.value)} maxLength={200} />
          </div>
        </form>
      </div>
    </div>
  );
}
