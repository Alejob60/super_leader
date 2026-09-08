# Checklist de PR - Code Review

## Seguridad
- [ ] No hay secretos hardcodeados (API keys, passwords, tokens)
- [ ] Autenticación implementada correctamente (JWT, OAuth)
- [ ] Rate limiting en endpoints sensibles
- [ ] Input validation en todos los endpoints
- [ ] Output encoding para prevenir XSS

## Manejo de Errores
- [ ] Errores estructurados con contexto
- [ ] Logging de errores sin datos sensibles
- [ ] Health check endpoint funcionando
- [ ] Timeouts configurados en llamadas externas

## Arquitectura
- [ ] Separación de capas clara (controllers, services, repositories)
- [ ] Dependency injection configurada
- [ ] Circuit breakers para servicios externos
- [ ] Reintentos con backoff exponencial

## Testing
- [ ] Tests unitarios con cobertura > 80%
- [ ] Tests de integración para flujos críticos
- [ ] Tests de contratos para APIs
- [ ] Mocking de servicios externos

## Operaciones
- [ ] Logging estructurado implementado
- [ ] Métricas de negocio instrumentadas
- [ ] Distributed tracing configurado
- [ ] Variables de entorno documentadas

## Code Quality
- [ ] Linter ejecutándose sin errores
- [ ] Type checking estricto (TypeScript) o equivalentes
- [ ] Code review realizado por al menos 1 persona
- [ ] No hay código duplicado significativo

## CI/CD
- [ ] Pipeline de CI ejecutándose
- [ ] SAST (Static Application Security Testing) configurado
- [ ] Dependency scanning habilitado
- [ ] Build reproducible desde cero
