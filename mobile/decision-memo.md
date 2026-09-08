# Memorando: Evaluación de react-native-background-geolocation

**Para:** Director de Ingeniería  
**De:** Líder Técnico  
**Fecha:** Septiembre 2026  
**Asunto:** Decisión técnica sobre librería de geolocalización en segundo plano

## Resumen

Evalúo la adopción de `mauron85/react-native-background-geolocation` para el tracking vehicular. **Recomendación: No adoptar.** La librería está abandonada y presenta riesgos operativos inaceptables para una plataforma de movilidad.

## Estado de Mantenimiento

| Métrica | Valor | Impacto |
|---------|-------|---------|
| Último commit | Hace 3+ años | Sin correcciones de seguridad |
| Issues abiertas | 200+ | Sin soporte comunitario activo |
| React Native compat | ≤ 0.60 | Incompatible con RN actual |
| Dependencias | React Native peer dependency obsoleto | Conflictos en instalación |

## Arquitectura y Cobertura

**Fortalezas:**
- API unificada para Android/iOS
- Soporte para geofencing
- Persistencia local de posiciones

**Debilidades:**
- Código nativo sin actualizaciones
- Sin soporte para nuevas versiones de Android/iOS
- Documentación desactualizada

## Riesgos Operativos

1. **Seguridad:** Sin parches para vulnerabilidades
2. **Estabilidad:** Crash reports en nuevas versiones de SO
3. **Mantenimiento:** Fork propio implica ~200 horas/año
4. **Compliance:** Podría no cumplir con nuevas políticas de ubicación

## Alternativas y Costos Total de Propiedad

| Alternativa | Licencia | Costo Anual | Mantenimiento |
|-------------|----------|-------------|---------------|
| **react-native-background-geolocation (fork propio)** | MIT | $0 | ~200 hrs ($10K) |
| **@mauron85/react-native-background-geolocation (actualizado)** | MIT | $0 | ~50 hrs ($2.5K) |
| **react-native-background-fetch** | MIT | $0 | Bajo |
| **Expo Location (managed workflow)** | MIT | $0 | Bajo |
| **Solución comercial (Life360 SDK)** | Comercial | $5K-15K | Soporte incluido |

## Recomendación

**Usar Expo Location + react-native-background-fetch**

**Justificación:**
- Compatibilidad con Expo managed workflow
- Comunidad activa y mantenimiento regular
- Bajo costo de adopción
- Suficiente para casos de uso de telemetría vehicular

**Costo estimado:** ~$2,500/año en tiempo de desarrollo

## Condiciones para Reversar

Cambiaría esta decisión si:
1. La flota supera 50,000 vehículos (necesitamos optimización nativa)
2. Los requisitos de precisión superan 5 metros (necesitamos GNSS diferencial)
3. Aparece una solución open source con soporte comercial
4. Los costos de licenciamiento comercial bajan de $3K/año

## Conclusión

La librería original representa un riesgo inaceptable. La alternativa propuesta ofrece mejor relación costo-beneficio y menor riesgo operativo.

**Decisión:** No adoptar react-native-background-geolocation  
**Alternativa:** Expo Location + react-native-background-fetch  
**Responsable:** Líder Técnico  
**Fecha:** Septiembre 2026
