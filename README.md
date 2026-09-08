# Super Leader - Plataforma de Movilidad y Telemetría Vehicular

## Cómo levantar el entorno

```bash
docker-compose up -d
```

Esto levanta:
- **Orquestador** (Go) en http://localhost:8080
- **Servicio de Emisión** (C#/.NET) en http://localhost:5000
- **Consola de Operaciones** (Next.js) en http://localhost:3000
- **Simuladores** en http://localhost:9090
- **PostgreSQL** en localhost:5432
- **Redis** en localhost:6379

## Arquitectura

Ver [docs/architecture.md](docs/architecture.md)

## Decisiones Técnicas

Ver [lead/README.md](lead/README.md)

## Video de Sustentación

[Link al video](#) - Pendiente

## Decisiones y Renuncias

Pendiente
