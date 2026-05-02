import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import bearer_token_required
from app.schemas.auth import LoginRequest, RegisterRequest
from app.repos import sessions_repo
from app.services.innovasoft_client import post_json
from app.utils.http_upstream import unwrap_upstream_error

router = APIRouter(prefix="/auth", tags=["auth"])
_log = logging.getLogger(__name__)


@router.post("/register")
async def register(body: RegisterRequest):
    upstream = await post_json(
        "/api/Authenticate/register",
        {"username": body.username, "email": body.email, "password": body.password},
    )
    try:
        data = upstream.json()
    except Exception:
        data = {}
    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=unwrap_upstream_error(
                "No se pudo completar el registro",
                upstream,
            ),
        )
    return data if data else {"status": "Success", "message": upstream.text or ""}


@router.post("/login")
async def login(body: LoginRequest):
    if not body.username.strip() or not body.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario y contraseña son requeridos",
        )

    upstream = await post_json(
        "/api/Authenticate/login",
        {"username": body.username.strip(), "password": body.password},
    )

    try:
        data = upstream.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta inválida del servicio remoto",
        )

    if upstream.status_code >= 400 or not isinstance(data, dict):
        raise HTTPException(
            status_code=max(upstream.status_code, status.HTTP_400_BAD_REQUEST),
            detail=unwrap_upstream_error("Credenciales inválidas o error de autenticación", upstream)
            if upstream.status_code >= 400
            else "Error de autenticación",
        )

    token = data.get("token")
    userid = data.get("userid")
    username = data.get("username")
    expiration = data.get("expiration")

    if not token or not userid:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El servicio no devolvió datos de sesión completos",
        )

    try:
        await sessions_repo.create_session_doc(
            str(token),
            str(userid),
            str(username or body.username.strip()),
            str(expiration) if expiration else None,
        )
    except Exception as exc:
        _log.exception("persist session to MongoDB failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No se pudo guardar la sesión (MongoDB). "
                "En Render/Atlas: revisa MONGODB_URI y Network Access (IP 0.0.0.0/0 o equivalente)."
            ),
        ) from exc

    return {
        "token": token,
        "userid": str(userid),
        "username": str(username or body.username.strip()),
        "expiration": expiration,
    }


@router.post("/logout")
async def logout(token: str = Depends(bearer_token_required)):
    try:
        await sessions_repo.delete_session_by_token(token)
    except Exception:
        _log.exception("MongoDB: cierre de sesión falló")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo cerrar la sesión en el servidor (MongoDB).",
        ) from None
    return {"ok": True}
