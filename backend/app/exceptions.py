class UpstreamUnavailableError(Exception):
    """Error de red, tiempo de espera o TLS al llamar al API remoto Innovasoft."""

    def __init__(self, message: str = "No se pudo contactar el servicio remoto (Innovasoft)."):
        super().__init__(message)
