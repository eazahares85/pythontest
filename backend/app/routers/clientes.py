from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_active_session_mapping
from app.repos.operaciones_repo import registrar_operacion
from app.schemas.cliente import ClienteActualizar, ClienteCrear, ClienteListadoBody
from app.services.innovasoft_client import delete_remote, get_json, post_json
from app.utils.http_upstream import cliente_id_desde_cuerpo, unwrap_upstream_error
from app.utils.json_safe import safe_json_response

router = APIRouter(prefix="/clientes", tags=["clientes"])


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
        out = upstream.text if upstream.ok else {}

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo actualizar el cliente", upstream),
        )
    return safe_json_response(out)


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
        out = upstream.text if upstream.ok else {}

    cid = cliente_id_desde_cuerpo(out) or "sin_id"
    await registrar_operacion("CREAR", username, cid, resultado)

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo crear el cliente", upstream),
        )
    return safe_json_response(out)


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
