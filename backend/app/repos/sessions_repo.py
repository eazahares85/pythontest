from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from app.mongo import get_db


SESIONES = "sesiones"


async def create_session_doc(
    token: str,
    userid: str,
    username: str,
    expiration: Optional[str] = None,
) -> None:
    doc: dict[str, Any] = {
        "token": token,
        "userid": userid,
        "username": username,
        "login_timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    if expiration:
        doc["expiration"] = expiration
    db = get_db()
    await db[SESIONES].delete_many({"userid": userid})
    await db[SESIONES].insert_one(doc)


async def get_session_by_token(token: str) -> Optional[Mapping[str, Any]]:
    return await get_db()[SESIONES].find_one({"token": token})


async def delete_session_by_token(token: str) -> None:
    await get_db()[SESIONES].delete_many({"token": token})
