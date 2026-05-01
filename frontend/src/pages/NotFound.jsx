export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center gap-4 py-5">
      <div className="d-flex align-items-center gap-4">
        <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: "6rem", opacity: 0.85 }} />
        <span className="error-hero lh-1">404</span>
      </div>
      <div className="text-secondary fw-semibold">Oops... Page Not Found!</div>
      <small className="text-muted px-4">La ruta solicitada no existe dentro del sistema.</small>
    </div>
  );
}
