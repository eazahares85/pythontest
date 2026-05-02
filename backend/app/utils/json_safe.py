import json
from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


def safe_json_response(body: Any) -> JSONResponse:
    try:
        encoded = jsonable_encoder(body)
        json.dumps(encoded, allow_nan=False)
        return JSONResponse(content=encoded)
    except (TypeError, ValueError, OverflowError):
        return JSONResponse(
            status_code=502,
            content={
                "detail": "El servicio remoto devolvió una respuesta que no se pudo serializar a JSON.",
            },
        )
