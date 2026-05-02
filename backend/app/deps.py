import logging
from typing import Any, Mapping, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.repos import sessions_repo

_bearer_schema = HTTPBearer(auto_error=False)
_log = logging.getLogger(__name__)


async def bearer_token_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_schema),
) -> Optional[str]:
    return creds.credentials.strip() if creds and creds.credentials else None


async def bearer_token_required(token: Optional[str] = Depends(bearer_token_optional)) -> str:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Se requiere autenticación")
    return token


async def get_active_session_mapping(
    token: str = Depends(bearer_token_required),
) -> Mapping[str, Any]:
    try:
        doc = await sessions_repo.get_session_by_token(token)
    except Exception:
        _log.exception("MongoDB: lectura de sesión falló")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de sesiones no disponible (MongoDB).",
        ) from None
    if doc is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión no válida o expirada")
    return doc
