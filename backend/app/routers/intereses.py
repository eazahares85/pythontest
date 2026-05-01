from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_active_session_mapping
from app.services.innovasoft_client import get_json
from app.utils.http_upstream import unwrap_upstream_error

router = APIRouter(prefix="/intereses", tags=["intereses"])


@router.get("")
async def listado(session=Depends(get_active_session_mapping)):
    token = str(session["token"])
    upstream = await get_json("/api/Intereses/Listado", bearer=token)

    try:
        data = upstream.json()
    except Exception:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo obtener el catálogo de intereses", upstream),
        )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error("No se pudo obtener el catálogo de intereses", upstream),
        )

    return data
