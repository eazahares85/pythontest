from typing import Any

import httpx


def unwrap_upstream_error(prefix: str, resp: httpx.Response) -> str:
    try:
        payload = resp.json()
        if isinstance(payload, dict) and "message" in payload:
            return f"{prefix}: {payload['message']}"
        if isinstance(payload, dict) and "errors" in payload:
            return f"{prefix}: {payload['errors']}"
        return f"{prefix} (HTTP {resp.status_code})"
    except Exception:
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
