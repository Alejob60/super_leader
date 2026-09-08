# Retos de Producción - Móvil

## Offline First: Túnel de 10 minutos

### Estrategia de Almacenamiento
```typescript
interface OfflineQueue {
  id: string;
  timestamp: number;
  location: { lat: number; lng: number; accuracy: number };
  speed: number;
  heading: number;
  battery: number;
  syncStatus: 'pending' | 'syncing' | 'synced';
}
```

### Sincronización Post-Conexión

**Tamaño de Lote:**
- Máximo 100 posiciones por request (evitar payload gigante)
- Compresión gzip del batch (~70% reducción)
- Idempotency key por posición individual

**Backpressure:**
- Si el servidor responde 429 (rate limit), esperar 30s
- Reducir frecuencia de reporte a 1 posición/30s durante sync
- Priorizar posiciones más recientes

**Idempotencia Server-Side:**
```sql
INSERT INTO positions (vehicle_id, timestamp, lat, lng)
VALUES ($1, $2, $3, $4)
ON CONFLICT (vehicle_id, timestamp) DO NOTHING;
```

**Estimación de Datos Offline:**
- 10 minutos × 1 posición/segundo = 600 posiciones
- ~200 bytes por posición = ~120KB en cola
- Con compresión: ~36KB

## Batería: Estrategias de Ahorro

### Nivel SO (Android)
```java
// Usar Fused Location Provider
LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 30000)
    .setMinUpdateDistanceMeters(50)
    .setMinUpdateIntervalMillis(15000)
    .build();
```

### Nivel SO (iOS)
```swift
// CLLocationManager con precisión reducida
locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
locationManager.distanceFilter = 50 // metros
locationManager.activityType = .automotiveNavigation
```

### Nivel Producto
- **Driving detection:** Acelerómetro detecta movimiento vehicular
- **Dynamic frequency:** 1s cuando se mueve, 30s cuando está estático
- **Batch local:** Acumular 10 posiciones antes de enviar
- **Night mode:** Reducir frecuencia entre 10pm-5am

### Impacto Estimado:
- Sin optimización: ~15% batería/día
- Con optimización: ~5% batería/día

## Consumo de Datos

### Supuestos:
- 1 posición/30 segundos (conducción)
- ~200 bytes por posición + metadata
- 8 horas de conducción/día
- 22 días hábiles/mes

### Cálculo:
```
8 horas × 3600 seg/hora / 30 seg = 960 posiciones/día
960 × 200 bytes = 192 KB/día
192 KB × 22 días = 4.2 MB/mes
```

### Con Headers HTTP y Compresión:
- HTTP headers: ~500 bytes/request
- Batch cada 5 minutos: 12 requests/día
- Total con overhead: ~5 MB/mes

### Conclusión:
**Dentro del límite de 20 MB/mes** con margen significativo. Incluso con duplicados y reintentos, no excederá 8 MB/mes.

## Distribución y Permisos

### Google Play (Android 12+)
**Permiso requerido:**
```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

**Proceso de aprobación:**
1. Declarar uso en Google Play Console
2. Formulario justificando necesidad de background
3. Revisión manual por Google (puede tomar 7 días)
4. Sample video demostrando la funcionalidad

**Restricciones:**
- No se puede pedir background location sin foreground primero
- Debe mostrar beneficio claro al usuario
- Opción de desactivar sin perder funcionalidad core

### Actualizaciones OTA vs Tiendas

| Método | Ventaja | Riesgo |
|--------|---------|--------|
| **OTA (CodePush)** | Deploy instantáneo, corrección de bugs | Puede causar incompatibilidad |
| **Google Play** | Revisión de seguridad, distribución controlada | Delay de 2-3 días |
| **OTA + Play Store** | Balance entre velocidad y seguridad | Complejidad operativa |

**Estrategia Recomendada:**
1. **Bugs críticos:** CodePush (inmediato)
2. **Features nuevas:** Play Store (controlado)
3. **Actualizaciones de SDK:** Play Store con staging

### Flota de Miles de Conductores:
- **Staged rollout:** 10% → 50% → 100%
- **Feature flags:** Activar por grupos de flota
- **Rollback:** CodePush permite revertir en minutos
- **Monitoreo:** Crash reporting en tiempo real
