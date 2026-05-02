from typing import Optional

from pydantic import BaseModel, Field


class ClienteListadoBody(BaseModel):
    identificacion: str = ""
    nombre: str = ""


class ClienteCamposInnovasoft(BaseModel):
    nombre: str = Field(..., max_length=50)
    apellidos: str = Field(..., max_length=100)
    identificacion: str = Field(..., max_length=20)
    celular: str = Field(..., max_length=20)
    otroTelefono: str = Field(..., max_length=20)
    direccion: str = Field(..., max_length=200)
    fNacimiento: str = Field(...)
    fAfiliacion: str = Field(...)
    sexo: str = Field(..., pattern="^[MF]$")
    resennaPersonal: str = Field(..., max_length=200)
    imagen: str = ""
    interesFK: str = Field(..., min_length=1)
    usuarioId: str = Field(..., min_length=1)


class ClienteCrear(ClienteCamposInnovasoft):
    pass


class ClienteActualizar(ClienteCamposInnovasoft):
    id: str = Field(..., min_length=1)


class SesionFrontend(BaseModel):
    token: str
    userid: str
    username: str
    expiration: Optional[str] = None
