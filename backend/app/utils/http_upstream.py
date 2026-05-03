import json
from typing import Any

import httpx


def _format_errors_dict(errors: Any) -> str:
    if errors is None:
        return ""
    if isinstance(errors, str):
        return errors.strip()
    if isinstance(errors, list):
        return "; ".join(str(x).strip() for x in errors if str(x).strip())
    if not isinstance(errors, dict):
        return str(errors)
    parts: list[str] = []
    for k, v in errors.items():
        key = str(k)
        if isinstance(v, list):
            parts.append(f"{key}: {', '.join(str(x) for x in v)}")
        elif isinstance(v, dict):
            parts.append(f"{key}: {_format_errors_dict(v)}")
        else:
            parts.append(f"{key}: {v}")
    return "; ".join(parts)


def extraer_razon_remota_innovasoft(cuerpo: Any) -> str | None:
    """
    Intenta obtener el motivo legible que devuelve Innovasoft (.NET / ProblemDetails / validación).
    """
    if cuerpo is None:
        return None
    if isinstance(cuerpo, str):
        s = cuerpo.strip()
        if s.startswith("{") and s.endswith("}"):
            try:
                return extraer_razon_remota_innovasoft(json.loads(s))
            except Exception:
                if len(s) > 800:
                    return s[:800] + "…"
                return s or None
        if s:
            return s[:800] + ("…" if len(s) > 800 else "")
        return None
    if not isinstance(cuerpo, dict):
        return None
    d = cuerpo
    if d.get("success") is False or d.get("Success") is False:
        for key in ("message", "Message", "detail", "Detail", "title", "Title"):
            v = d.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
    for key in ("errors", "Errors"):
        if key in d and d[key]:
            return _format_errors_dict(d[key])
    for key in ("message", "Message", "detail", "Detail", "title", "Title"):
        v = d.get(key)
        if v is not None:
            t = str(v).strip()
            if t:
                return t
    return None


def unwrap_upstream_error(prefix: str, resp: httpx.Response) -> str:
    try:
        payload = resp.json()
    except Exception:
        return f"{prefix} (HTTP {resp.status_code})"
    razon = extraer_razon_remota_innovasoft(payload)
    if razon:
        return f"{prefix}: {razon}"
    return f"{prefix} (HTTP {resp.status_code})"


def cliente_id_desde_cuerpo(data: Any) -> str:
    if isinstance(data, dict) and data.get("id") is not None:
        return str(data["id"]).strip()
    if isinstance(data, str):
        return data.strip()
    return ""


def cliente_id_desde_respuesta(resp: httpx.Response) -> str:
    try:
        return cliente_id_desde_cuerpo(resp.json())
    except Exception:
        return ""
