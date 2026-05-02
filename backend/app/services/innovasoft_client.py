from typing import Any, Optional

import httpx

from app.config import get_settings
from app.exceptions import UpstreamUnavailableError

timeout = httpx.Timeout(45.0, connect=10.0)


def _headers(bearer_token: Optional[str] = None) -> dict[str, str]:
    h = {"Accept": "application/json"}
    if bearer_token:
        h["Authorization"] = f"Bearer {bearer_token}"
    return h


async def post_json(path: str, body: dict[str, Any], bearer: Optional[str] = None) -> httpx.Response:
    url = get_settings().innovasoft_url(path)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.post(url, json=body, headers=_headers(bearer))
    except httpx.HTTPError as exc:
        raise UpstreamUnavailableError() from exc


async def get_json(path: str, bearer: Optional[str] = None) -> httpx.Response:
    url = get_settings().innovasoft_url(path)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.get(url, headers=_headers(bearer))
    except httpx.HTTPError as exc:
        raise UpstreamUnavailableError() from exc


async def delete_remote(path: str, bearer: str) -> httpx.Response:
    url = get_settings().innovasoft_url(path)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.delete(url, headers=_headers(bearer))
    except httpx.HTTPError as exc:
        raise UpstreamUnavailableError() from exc
