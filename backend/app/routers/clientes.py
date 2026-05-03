import asyncio
import json
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_active_session_mapping
from app.repos.operaciones_repo import registrar_operacion
from app.schemas.cliente import ClienteActualizar, ClienteCrear, ClienteListadoBody
from app.services.innovasoft_client import delete_remote, get_json, post_json
from app.utils.http_upstream import (
    cliente_id_desde_cuerpo,
    extraer_razon_remota_innovasoft,
    unwrap_upstream_error,
)
from app.utils.json_safe import safe_json_response

router = APIRouter(prefix="/clientes", tags=["clientes"])


def _fallback_body_if_not_json(upstream) -> Any:
    if 200 <= upstream.status_code < 300:
        return upstream.text or ""
    return {}


def _normalizar_listado_clientes(raw: Any) -> list:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for k in ("data", "items", "result", "value", "clientes", "Data", "Items", "Result"):
            v = raw.get(k)
            if isinstance(v, list):
                return v
    return []


async def _id_cliente_tras_listado(
    *,
    token: str,
    userid: str,
    identificacion: str,
    nombre: str,
) -> str:
    await asyncio.sleep(0.25)
    list_payload = {
        "identificacion": (identificacion or "").strip(),
        "nombre": (nombre or "").strip(),
        "usuarioId": userid,
    }
    try:
        lr = await post_json("/api/Cliente/Listado", list_payload, bearer=token)
    except Exception:
        return ""
    if lr.status_code >= 400:
        return ""
    try:
        raw = lr.json()
    except Exception:
        return ""
    rows = _normalizar_listado_clientes(raw)
    ident = (identificacion or "").strip().casefold()
    nom = (nombre or "").strip().casefold()
    if not ident:
        return ""

    def _row_ident(r: dict) -> str:
        for k in ("identificacion", "Identificacion"):
            if k in r and r[k] is not None:
                return str(r[k]).strip()
        return ""

    def _row_nombre(r: dict) -> str:
        for k in ("nombre", "Nombre"):
            if k in r and r[k] is not None:
                return str(r[k]).strip()
        return ""

    def _row_id(r: dict) -> str:
        for k in ("id", "Id", "clienteId", "ClienteId"):
            if k in r and r[k] is not None:
                s = str(r[k]).strip()
                if s:
                    return s
        return ""

    matches = [r for r in rows if isinstance(r, dict) and _row_ident(r).casefold() == ident]
    if nom:
        for r in matches:
            if _row_nombre(r).casefold() == nom:
                cid = _row_id(r)
                if cid:
                    return cid
    for r in matches:
        cid = _row_id(r)
        if cid:
            return cid
    return ""


def _motivo_sin_id_remoto(upstream: httpx.Response) -> str:
    ct = upstream.headers.get("content-type", "") or "(sin Content-Type)"
    raw = (upstream.text or "").strip()
    base = (
        f"HTTP {upstream.status_code}; Content-Type: {ct}. "
        "Desde este proxy no se recibió un JSON con el campo id del cliente creado."
    )
    if not raw:
        return (
            base
            + " El cuerpo estaba vacío: no hay detalle del servidor Innovasoft "
            "(timeout, error intermedio o el API no documenta la respuesta de éxito)."
        )
    snip = raw[:400].replace("\n", " ")
    return (
        base
        + f" Cuerpo (extracto, no válido como JSON con id): {snip!r}"
    )


def _exito_cliente_payload(out: Any, *, cliente_id: str, crear: bool) -> dict[str, Any]:
    msg = "Cliente creado correctamente." if crear else "Cliente actualizado correctamente."
    if isinstance(out, dict):
        merged = dict(out)
        if "mensaje" not in merged:
            m = merged.get("message")
            merged["mensaje"] = (m if isinstance(m, str) and m.strip() else None) or msg
        merged.pop("message", None)
        merged.pop("razon", None)
        cid = str(merged.get("id", "")).strip()
        if (not cid or cid == "sin_id") and cliente_id and cliente_id != "sin_id":
            merged["id"] = cliente_id
        cid = str(merged.get("id", "")).strip()
        merged["exito"] = bool(cid and cid != "sin_id")
        return merged
    if isinstance(out, str) and out.strip():
        raw = out.strip()
        if raw.startswith("{") and raw.endswith("}"):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return _exito_cliente_payload(parsed, cliente_id=cliente_id, crear=crear)
            except Exception:
                pass
        return {"id": raw, "mensaje": msg, "exito": True}
    if cliente_id and cliente_id != "sin_id":
        return {"id": cliente_id, "mensaje": msg, "exito": True}
    return {
        "id": "",
        "exito": False,
        "mensaje": (
            "Innovasoft no devolvió un identificador de cliente ni un cuerpo JSON reconocible; "
            "no se puede confirmar si el alta quedó registrada allí."
        ),
    }


async def _parse_json_upstream(upstream_name: str, resp) -> Any:
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=unwrap_upstream_error(upstream_name, resp),
        )
    try:
        data = resp.json()
    except Exception:
        return resp.text
    return safe_json_response(data)


@router.post("/listado")
async def listado(
    body: ClienteListadoBody,
    session=Depends(get_active_session_mapping),
):
    token = str(session["token"])
    userid = str(session["userid"])
    payload = {
        "identificacion": body.identificacion or "",
        "nombre": body.nombre or "",
        "usuarioId": userid,
    }
    upstream = await post_json("/api/Cliente/Listado", payload, bearer=token)
    return await _parse_json_upstream("Error al listar clientes", upstream)


@router.post("/actualizar")
async def actualizar(
    body: ClienteActualizar,
    session=Depends(get_active_session_mapping),
):
    token = str(session["token"])
    username = str(session.get("username", ""))

    datos = body.model_dump()
    datos["usuarioId"] = str(session["userid"])

    upstream = await post_json("/api/Cliente/Actualizar", datos, bearer=token)
    resultado = upstream.status_code
    cliente_id = str(body.id)
    await registrar_operacion("ACTUALIZAR", username, cliente_id, resultado)

    try:
        out = upstream.json()
    except Exception:
        out = _fallback_body_if_not_json(upstream)

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo actualizar el cliente", upstream),
        )
    payload = _exito_cliente_payload(out, cliente_id=cliente_id, crear=False)
    return safe_json_response(payload)


@router.post("")
async def crear(
    body: ClienteCrear,
    session=Depends(get_active_session_mapping),
):
    token = str(session["token"])
    username = str(session.get("username", ""))
    data = body.model_dump()
    data["usuarioId"] = str(session["userid"])

    upstream = await post_json("/api/Cliente/Crear", data, bearer=token)
    resultado = upstream.status_code
    try:
        out = upstream.json()
    except Exception:
        out = _fallback_body_if_not_json(upstream)

    cid = cliente_id_desde_cuerpo(out) or "sin_id"
    await registrar_operacion("CREAR", username, cid, resultado)

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo crear el cliente", upstream),
        )
    payload = _exito_cliente_payload(out, cliente_id=cid, crear=True)
    fid = str(payload.get("id", "")).strip()
    if not fid or fid == "sin_id":
        nid = await _id_cliente_tras_listado(
            token=token,
            userid=str(session["userid"]),
            identificacion=body.identificacion,
            nombre=body.nombre,
        )
        if nid:
            merged: dict[str, Any] = {"id": nid}
            if isinstance(out, dict):
                merged = {**dict(out), "id": nid}
            payload = _exito_cliente_payload(merged, cliente_id=nid, crear=True)
            payload["mensaje"] = (
                "Cliente creado correctamente. El id se obtuvo del listado porque Innovasoft "
                "respondió al alta sin cuerpo JSON con el identificador."
            )
        else:
            razon_remota = extraer_razon_remota_innovasoft(out)
            tecnico = _motivo_sin_id_remoto(upstream)
            if razon_remota:
                texto = f"Innovasoft: {razon_remota} — {tecnico}"
            else:
                texto = (
                    "No se pudo confirmar la creación: Innovasoft no devolvió id en el alta, "
                    f"y el listado no devolvió un cliente con esta identificación. — {tecnico}"
                )
            payload = {"id": "", "exito": False, "mensaje": texto}
    else:
        payload.setdefault("exito", True)
        payload.setdefault("mensaje", "Cliente creado correctamente.")
    return safe_json_response(payload)


@router.get("/{cliente_id}")
async def obtener(
    cliente_id: str,
    session=Depends(get_active_session_mapping),
):
    token = str(session["token"])
    path = f"/api/Cliente/Obtener/{cliente_id}"
    upstream = await get_json(path, bearer=token)
    return await _parse_json_upstream("No se pudo obtener el cliente", upstream)


@router.delete("/{cliente_id}")
async def eliminar(
    cliente_id: str,
    session=Depends(get_active_session_mapping),
):
    token = str(session["token"])
    username = str(session.get("username", ""))
    path = f"/api/Cliente/Eliminar/{cliente_id}"
    upstream = await delete_remote(path, bearer=token)
    resultado = upstream.status_code
    await registrar_operacion("ELIMINAR", username, cliente_id, resultado)

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo eliminar el cliente", upstream),
        )
    return {"ok": True, "status": upstream.status_code}
