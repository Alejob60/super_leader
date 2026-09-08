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

## Video de Sustentación

[Link al video de YouTube](#) - Pendiente de grabar

## Arquitectura

Ver [docs/architecture.md](docs/architecture.md)

## Decisiones Técnicas

### Orquestador Go
- Máquina de estados explícita con transiciones validadas
- Outbox pattern para publicación confiable de eventos
- Circuit breaker hacia emisor legado
- Dead letter queue para mensajes agotados
- Job de reconciliación para órdenes atascadas

### Servicio C# Anti-Corruption Layer
- Traduce contrato legado a dominio limpio
- Maneja errores de negocio ocultos en HTTP 200
- Idempotente por referencia externa
- Pruebas unitarias sobre mapeo y validación

### Consola de Operaciones
- TypeScript en modo estricto
- Tipos derivados del contrato API
- Actualización con polling optimizado
- Acciones operativas con confirmación

### Simuladores
- Configurable vía variables de entorno
- Inyección de caos controlada
- Webhooks duplicados y fuera de orden
- Timeouts y caídas totales simuladas

## Documentación de Móvil

### Decisión de Librería
Ver [mobile/decision-memo.md](mobile/decision-memo.md)

**Resumen:** No adoptar react-native-background-geolocation. Usar Expo Location + react-native-background-fetch.

### Retos de Producción
Ver [mobile/production-challenges.md](mobile/production-challenges.md)

- **Offline first:** Cola local con sync por lotes
- **Batería:** Frecuencia dinámica según movimiento
- **Datos:** ~5 MB/mes por vehículo
- **Distribución:** CodePush + Play Store staged rollout

## Reporte de IA

Ver [docs/ai-report.md](docs/ai-report.md)

- Herramientas: opencode, GitHub Copilot, Docker
- 6 prompts documentados con contexto completo
- 1 alucinación detectada y corregida
- Comparación IA vs humano en code review

## Code Review

Ver [review/README.md](review/README.md)

- 3 repos revisados (Go, C#, TypeScript)
- 18 hallazgos identificados (6 por repo)
- PR con pruebas en fork
- Filtro de hiring para desarrollador senior

## Liderazgo

Ver [lead/README.md](lead/README.md)

- Plan 30/60/90 días
- ADR sobre estandarización Go vs C#
- Conversación difícil (desarrollador + negocio)
- Métricas DORA y mitigación de Goodhart
- Estimación del Epic con supuestos

## Decisiones y Renuncias

### Lo que se Entregó:
1. Orquestador Go con patrones de resiliencia
2. Servicio C# anti-corruption layer
3. Consola de operaciones Next.js
4. Simuladores con inyección de caos
5. docker-compose funcional
6. Informe de code review completo
7. Documentación de liderazgo
8. Arquitectura AWS detallada
9. Reporte de IA

### Lo que se Renunció:
1. **Prototipo móvil funcional** - Solo se creó documentación de decisión
2. **PR con quality gates completos** - Se documentó el checklist pero no se implementó CI/CD en el fork
3. **Tests de carga** - Se diseñó la arquitectura pero no se ejecutaron
4. **Integración real con terceros** - Solo simuladores stub

### Con Más Tiempo (1 mes + equipo):
1. Implementar el prototipo React Native funcional
2. Agregar tests de contrato con Pact
3. Implementar circuit breaker completo con métricas
4. Dashboard de operaciones en tiempo real
5. CI/CD pipeline completo con SAST
6. Monitoring con Prometheus + Grafana
