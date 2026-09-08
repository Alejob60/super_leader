# Filtro Técnico para Desarrollador Senior Fullstack

## Ejercicio Propuesto

**Enunciado:** Diseña e implementa un microservicio que reciba webhook de un proveedor de pagos, valide la firma, procese el pago y publique un evento. El servicio debe manejar duplicados, eventos fuera de orden, y fallas del proveedor.

**Stack:** TypeScript/Node.js o Go (a elección del candidato)

**Tiempo:** 4 horas

**Entregable:** Código funcional con tests + docker-compose + README con decisiones de diseño

### Por qué este ejercicio y no otro:
1. **Cubre patrones de resiliencia reales** - no es un CRUD básico
2. **Requiere manejo de estado** - eventos out-of-order y idempotencia
3. **Toca seguridad** - validación de firma HMAC
4. **Permite evaluar criterio** - el candidato debe tomar decisiones de diseño
5. **Es comparable** - todos resuelven el mismo problema, facilitando la evaluación

## Señales para Avanzar

**Señales positivas (avanzar):**
- Pregunta sobre requisitos no funcionales antes de empezar
- Implementa manejo de errores explícito, no genérico
- Usa tipos/estructuras de datos apropiadas
- Escribe tests que cubran casos edge
- Documenta sus decisiones de diseño
- Pregunta sobre observabilidad y monitoreo

**Señales de alerta (no avanzar):**
- Empieza a codear sin preguntar nada
- No maneja errores de red o timeout
- No implementa idempotencia
- Tests superficiales o ausentes
- No puede explicar por qué eligió cierto patrón
- Hardcodea configuración

## Evaluación de Candidatos que Usaron IA

### Preguntas en la Sustentación:
1. "Explícame por qué elegiste [patrón específico] para manejar los webhooks duplicados"
2. "¿Qué alternativas consideraste y por qué descartaste [otra opción]?"
3. "¿Cómo decidiste el número máximo de reintentos? ¿Qué pasa si el proveedor se cae por 1 hora?"
4. "¿Qué métricas instrumentarías para monitorear este servicio en producción?"
5. "Si el volumen sube de 100 a 10,000 webhooks por segundo, ¿qué cambiarías?"

### Criterio:
- Si puede explicar el **por qué** de cada decisión → IA como herramienta, candidato válido
- Si repite patrones sin entender → Copiar y pegar, no avanzar
- Si puede discutir trade-offs → Líder potencial
- Si no puede justificar una línea →Descalificar

## Qué NO Vale la Pena Evaluar

| Qué no evaluar | Por qué | Cómo cubrir el riesgo |
|----------------|---------|----------------------|
| Velocidad de código | No mide calidad ni criterio | Evaluación por PRs en code review |
| Conocimiento de framework específico | Se aprende en 2 semanas | Evaluación de fundamentos (algoritmos, patrones) |
| Certificaciones | No garantizan competencia | Referencias laborales + ejercicios prácticos |
| Experiencia年限 | No correlaciona con capacidad | Evaluación por problemas concretos |

**Cómo cubrir el riesgo:** Referencias de ex-compañeros + período de prueba de 3 meses con objetivos claros + code review continuo del equipo.
