# Liderazgo Técnico y Gobierno de Ingeniería

## Plan de 30, 60 y 90 Días

### 30 Días: Diagnosticar y Estabilizar
- **Semana 1-2:** 1:1 con cada miembro del equipo, entender pain points actuales
- **Semana 2-3:** Auditar código existente, identificar deuda técnica crítica
- **Semana 3-4:** Establecer métricas base (DORA), definir Definition of Done

**Qué medir desde el día 1:**
- Lead time (tiempo de commit a deploy)
- Change failure rate
- Mean time to recovery (MTTR)
- Developer satisfaction (encuesta semanal)

### 60 Días: Procesos y Calidad
- Implementar code review obligatorio (2 aprobaciones mínimo)
- Establecer pipeline de CI/CD con quality gates
- Reducir deuda técnica en 30% (medido en tiempo de desarrollo afectado)
- Primera release con zero-downtime deployment

### 90 Días: Escalar y Mentorizar
- Transferir ownership de features a semi-seniors
- Implementar feature flags para releases más seguros
- Establecer tech talks semanales (rotación de presentadores)
- Documentar y automatizar onboarding de nuevos miembros

---

## ADR: Estandarización de Lenguaje de Programación

**Título:** Decisión sobre estandarización de stack (Go vs C#)

**Estado:** Propuesto

**Contexto:**
Actualmente el equipo mantiene servicios en Go y C#, con lógica de dominio duplicada. Esto causa:
- Doble esfuerzo para mantener features similares
- Dificultad para rotar desarrolladores entre servicios
- Inconsistencias en patrones y convenciones

**Opciones Consideradas:**

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Estandarizar en Go** | Mejor rendimiento, más ligero para microservicios | Pérdida de inversión en C#, learning curve para equipo .NET |
| **B. Estandarizar en C#** | Mejor tooling, más maduro para enterprise | Más pesado para servicios simples, licencias potenciales |
| **C. Mantener ambos con reglas** | Sin migración, aprovechar expertise existente | Duplicación continúa, más complejidad |
| **D. Asignación por dominio** | Cada servicio en el lenguaje más adecuado | Reglas complejas, inconsistencia |

**Decisión:** Opción D - Asignación por dominio con reglas claras

- **Nuevos servicios:** Go por defecto (mejor performance, menos overhead)
- **Servicios existentes en C#:** Mantener hasta refactorización natural
- **Lógica compartida:** Extraer a librería shared o API interna

**Consecuencias:**

*Buenas:*
- Sin big bang migration, bajo riesgo
- Aprovechamos expertise existente
- Go para servicios nuevos = mejor performance

*Malas:*
- Duplicación temporal mientras se migra
- Equipo necesita mantener expertise en ambos
- Reglas de asignación requieren gobernanza activa

**Criterios de Reversión:**
- Si la duplicación causa más de 20% de overhead en desarrollo
- Si la rotación de equipo se vuelve inviable
- Si los costos de mantenimiento superan el 30% del tiempo productivo

**Fecha:** Septiembre 2026
**Responsable:** Líder Técnico

---

## Conversación Difícil

### Al Desarrollador Senior:

"Juan, valoro mucho tu velocidad y el impacto que has tenido en el último sprint. Sin embargo, noté que los últimos 3 features se entregaron sin tests automatizados.

Entiendo la presión de las fechas - negocio las comprometió directamente. Pero hay un problema: sin tests, cada cambio nuevo corre el riesgo de romper funcionalidad existente. Esto nos costó 2 días la semana pasada arreglando un bug en producción.

Mi propuesta: para el próximo feature, dedica 2 horas a escribir tests críticos. Si las fechas no dan, háblame antes para renegotiar el alcance. No es opcional - es parte de la Definition of Done que acordamos."

### A Negocio:

"Entiendo la urgencia de entregar el feature para la campaña. Pero necesito explicarles el costo real: sin tests, el 30% de nuestro tiempo se va a corregir bugs en producción. Con tests, ese tiempo se reduce al 5%.

Les propongo: entregamos el feature con un 20% de funcionalidad reducida esta semana, y completamos el resto la próxima con tests incluidos. Así cumplimos la fecha y protegemos la calidad."

**Total: 287 palabras**

---

## Métricas de Ingeniería

### Métricas a Instrumentar (DORA):
1. **Deployment Frequency:** Commits a producción por semana
2. **Lead Time for Changes:** Tiempo de commit a producción
3. **Change Failure Rate:** % de deployments que causan incidentes
4. **Mean Time to Recovery:** Tiempo promedio de recuperación

### Cómo Obtenerlas Técnicamente:
- **Deployment Frequency:** GitHub API + webhook de deploy
- **Lead Time:** Git timestamps + deploy timestamps (automatizado)
- **Change Failure Rate:** PagerDuty/Jira incidents + deployments
- **MTTR:** Incident timestamps + resolution timestamps

### Riesgo de Optimización en Vacío:
Si el equipo empieza a optimizar métricas en lugar de valor:
- **Deployment Frequency alta pero sin calidad:** Commits fragmentados sin testing
- **Lead time corto pero con más incidents:** Skipping quality gates
- **MTTR bajo pero con workarounds:** Hot fixes sin resolver causa raíz

**Mitigación:** Revisar métricas en contexto, nunca aisladamente. Pair con métricas de calidad del producto.

---

## Deuda Técnica

### Cómo Hacerla Visible:
1. **Tech Debt Board:** Kanban dedicado con items estimados en horas
2. **Impact Report Semanal:** "Esta semana perdimos X horas por [deuda específica]"
3. **Quality Score:** Dashboard con métricas de code smells, coverage, etc.

### Cómo Financiarla:
- **20% de capacity por sprint** dedicado a deuda técnica
- **Cada feature incluye refactorización** de áreas adyacentes
- **Tech debt milestones** como requisito para releases mayores

### Ejemplo Concreto - Traducción a Dinero:

**Deuda:** "El endpoint de pagos no tiene retry con backoff"

**Impacto en dinero:**
- Incidentes promedio: 2/mes × 4 horas × $50/hora = $400/mes en tiempo de desarrollo
- Pérdida de transacciones: ~5% de pagos fallidos por timeouts = $2,000/mes
- **Total impacto: $2,400/mes**

**Costo de resolver:** 16 horas × $50/hora = $800

**ROI:** Resolución en 1 mes, ahorro continuo de $2,400/mes

---

## Estimación - Epic: Integración de Negocio End-to-End

### Descomposición:

| Historia | Tamaño | Dependencias |
|----------|--------|--------------|
| Orquestador Go con máquina de estados | L | Base de datos |
| Servicio C# anti-corruption layer | M | Contrato del orquestador |
| Consola Next.js | M | API del orquestador |
| Simuladores de terceros | S | Ninguna |
| Integración docker-compose | M | Todos los servicios |
| Tests end-to-end | L | Todo integrado |

### Estimación con Rango:

**Equipo de 5 personas (2 senior, 2 semi, 1 praticante):**

| Escenario | Duración | Supuestos |
|-----------|----------|-----------|
| **Optimista** | 3 semanas | Sin blockers, scope fijo |
| **Realista** | 5 semanas | Cambios menores, 1 bug crítico |
| **Pesimista** | 8 semanas | Cambios de scope, problemas de integración |

### Tres Supuestos que Pueden Hacerla Fallar:

1. **El emisor legado tiene contrato más complejo del esperado**
   - Impacto: +2 semanas en anti-corruption layer
   - Mitigación: Spike técnico antes de estimar

2. **Los simuladores no reproducen fielmente los escenarios de falla**
   - Impacto: +1 semana en testing
   - Mitigación: Validar con equipo de QA antes de empezar

3. **Problemas de infraestructura Docker en Windows**
   - Impacto: +1 semana en integración
   - Mitigación: Usar Linux containers o云 VMs
