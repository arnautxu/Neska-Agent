# Architecture and trust boundaries


## Identidad, tenancy y autorización


El bootstrap de propietarios es un acto de host separado de las sesiones de empleado. `AIBRAIN_ADMIN_USER_IDS` solo puede crear el primer estado cuando contiene un UUID ya provisionado. Una vez existe `dataRoot/workspace-admin/state.json`, cambiar esa variable no altera asignaciones; los nuevos miembros empiezan como `workspace-member` y toda promoción pasa por una mutación autenticada y auditada.

## Runtime, approvals y secretos


## Threat model focal

- Robo o fijación de sesión: el identificador es aleatorio, solo su hash se persiste; cookies `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-`, timeout idle y absoluto. Riesgo residual: el robo de cookie sigue siendo válido hasta revocación/expiración; TLS y seguridad del endpoint son obligatorios.
- CSRF: toda mutación de empleado exige origen igual a `InstallationConfig.publicUrl`; la cookie no sustituye este control.
- IDOR cross-user/cross-project: las rutas no aceptan `userId` del navegador y resuelven almacenamiento desde la sesión y el thread server-side. Los UUID ajenos devuelven denegación/not-found sin abrir su root.
- Escalada por variable de entorno: `AIBRAIN_USAGE_ADMIN_USER_IDS` ya no concede acceso. El bootstrap de owner no se reevalúa después de crear el estado durable.
- Escalada por cambio concurrente de rol: cada request administrativo y cada turno relee la política durable. Un turno ya iniciado conserva su snapshot inmutable; revocar acceso exige además `disable`, que revoca sesiones y detiene runtime.
- Prompt injection: mensajes, documentos, web y outputs son datos no fiables; no pueden cambiar las reglas resueltas server-side. Esto es defensa conductual adicional, no reemplazo del sandbox físico.
- Symlink/path traversal: stores de sesión, usuario, permisos, approvals y workers validan IDs, raíces canónicas, tipos de fichero, ownership/modes y rechazan symlinks/hardlinks donde aplica.
- Exposición de secretos: el worker recibe una allowlist de variables y roots privados. Credenciales de conectores deben vivir fuera del repo y montarse solo en el adapter autorizado; la aceptación live debe inspeccionar `/proc/<pid>/environ` de procesos no autorizados sin imprimir valores.

## Gates de aceptación pendientes

1. Crear Usuario B y Usuario A en el IdP real, provisionar ambos UUID sin datos de demo y asignar owner/admin/member de forma explícita.
2. Ejecutar login, renovación, logout, disable/recovery y revocación en dos navegadores independientes.
3. Probar matriz cross-user en rutas, proyectos, threads, documentos, browser, approvals, settings, usage y runtime real.
4. Cerrar la auditoría del fingerprint compuesto de grupos y permisos antes del primer turno live aceptado.
5. Verificar en el host que procesos de Usuario B, Usuario A, conversión, browser y conectores solo reciben los secretos autorizados.
6. Registrar SHA desplegado, timestamps, receipts y resultados en el runbook de release; hasta entonces todo lo anterior es local, no live.
