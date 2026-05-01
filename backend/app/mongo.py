from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

_client: Optional[AsyncIOMotorClient] = None


def mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(get_settings().mongodb_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return mongo_client()[get_settings().mongodb_db]


async def close_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
