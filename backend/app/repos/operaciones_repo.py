import logging
from datetime import datetime, timezone
from typing import Any

from app.mongo import get_db

OPERACIONES = "operaciones"
_log = logging.getLogger(__name__)


async def registrar_operacion(
    accion: str,
    usuario: str,
    cliente_id: str,
    resultado: int,
) -> None:
    doc: dict[str, Any] = {
        "accion": accion,
        "usuario": usuario,
        "cliente_id": cliente_id,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "resultado": resultado,
    }
    try:
        await get_db()[OPERACIONES].insert_one(doc)
    except Exception:
        _log.exception(
            "Auditoría MongoDB (operaciones) no disponible; la operación principal sigue",
        )
