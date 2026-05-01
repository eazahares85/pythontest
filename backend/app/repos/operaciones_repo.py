from datetime import datetime, timezone
from typing import Any

from app.mongo import get_db


OPERACIONES = "operaciones"


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
    await get_db()[OPERACIONES].insert_one(doc)
