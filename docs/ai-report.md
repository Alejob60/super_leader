# Reporte de IA

## 1. Herramientas Utilizadas

| Herramienta | Tarea Específica |
|-------------|------------------|
| **opencode (mimo-v2-free)** | Asistente principal para generación de código, documentación y planificación |
| **GitHub Copilot** | Completado de código en tiempo real en VS Code |
| **Docker Desktop** | Containerización y orquestación de servicios |

## 2. Bitácora de Prompts

### Prompt 1: Estructura del Proyecto
```
Crea la estructura de directorios para un proyecto de microservicios con:
- Orchestrator en Go
- Issuing service en C#/.NET
- Console en Next.js
- Simulator en Node.js
Incluye docker-compose con PostgreSQL y Redis
```

### Prompt 2: Máquina de Estados en Go
```
Implementa una máquina de estados explícita en Go para órdenes de seguro vehicular:
States: CREATED, QUOTED, PAYMENT_PENDING, PAID, ISSUING, ISSUED
Requisitos:
- Transiciones válidas entre estados
- Persistencia en PostgreSQL
- Soporte para idempotency-key
```

### Prompt 3: Anti-Corruption Layer en C#
```
Crea un adaptador en C# que envuelva un API legado con:
- Contrato verboso y campos redundantes
- Errores de negocio en HTTP 200
- Timeouts y reintentos
Expone un contrato limpio y tipado hacia adentro
```

### Prompt 4: Simulador con Caos
```
Implementa un stub de API en Node.js que simule:
- 10% de webhooks duplicados
- 5% de peticiones con formato inválido
- Timeouts variables en el emisor
- Ventana de caída total del emisor
Incluye endpoints para control de chaos
```

### Prompt 5: Code Review Hallazgos
```
Analiza los siguientes repositorios RealWorld y genera hallazgos de code review:
- gothinkster/golang-gin
- gothinkster/aspnetcore
- reck1ess/next-realworld
Enfócate en seguridad, manejo de errores y preparación para producción
```

### Prompt 6: ADR de Estandarización
```
Escribe un Architecture Decision Record sobre:
- Equipo mantiene Go y C#
- Lógica de dominio duplicada
- Opciones: estandarizar, mantener ambos, o asignación por dominio
Incluye contexto, opciones, decisión y criterios de reversión
```

## 3. La Alucinación

### Caso Detectado:
La IA sugirió usar `github.com/redis/go-redis/v9` en el go.mod inicial, pero la versión exacta `v9.5.1` no existía en el momento de la verificación.

### Cómo lo Detecté:
Al ejecutar `go mod tidy`, el comando falló con:
```
go: github.com/redis/go-redis/v9@v9.5.1: invalid version: unknown revision
```

### Corrección:
Actualicé la dependencia a una versión estable disponible:
```go
require (
    github.com/redis/go-redis/v9 v9.5.1 // → v9.7.3
)
```

### Lección:
Siempre verificar la existencia de paquetes antes de agregarlos al go.mod. La IA puede generar referencias a versiones que aún no existen o que son hipotéticas.

## 4. IA Aplicada al Code Review

### Primera Pasada con IA (Copilot):
**Encontró la IA:**
- Falta de rate limiting en endpoints de autenticación
- JWT secret hardcodeado
- Sin health check endpoint
- Manejo genérico de errores

**No encontré yo (y debería haber visto):**
- Falta de distributed tracing en los 3 repos
- Ausencia de circuit breakers para servicios externos

**Que yo encontré que la IA no vio:**
- La comparación transversal entre los 3 stacks (valor de líder)
- Implicaciones de negocio de cada hallazgo
- El contexto de por qué ciertos patrones son problemáticos en movilidad

**Que la IA reportó incorrectamente:**
- Sugerencia de usar `helmet.js` en repos Go (irrelevante)
- Confusión entre rate limiting y throttling

### Conclusión:
La IA es útil para hallazgos superficiales pero no reemplaza el criterio de un líder técnico que entiende el contexto de negocio y las implicaciones de producción.

## 5. Política de Uso de IA para el Equipo

### Qué se Puede Pegar:
- Código boilerplate (controllers, DTOs, configs)
- Tests unitarios para lógica conocida
- Documentación técnica y READMEs
- Refactorizaciones mecánicas

### Qué NUNCA se Puede Pegar:
- Secretos, credenciales o datos personales
- Código propietario de clientes
- Lógica de negocio sin entender
- Decisiones de arquitectura sin justificación

### Cómo Se Revisa el Código Generado:
1. **Entender antes de aceptar:** Cada línea debe ser explicable
2. **Testing obligatorio:** Todo código generado debe tener tests
3. **Review humano:** Ningún PR merge sin review de otro humano
4. **Documentar origen:** Marcar con `// AI-generated` para trazabilidad

### Riesgo de Dependencia en Practicantes:
- **Señal:** Practicante no puede explicar código que escribió
- **Mitigación:** Pair programming semanal con senior
- **Evaluación:** Examen oral del código en 1:1
- **Capacitación:** Curso de fundamentos (algoritmos, patrones)

### Licenciamiento:
- Verificar licencia de herramientas de IA
- No usar código generado por IA con licencia restrictiva
- Mantener registro de herramientas usadas por proyecto
