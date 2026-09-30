# Integración ETG · Progreso

Rama: `feature/etg-integration` (worktree `dominican-routes-etg`). Nada fusionado en `main`.

## Fases

| # | Fase | Estado |
|---|---|---|
| 1 | Análisis del proyecto, del YAML y de la colección de autotests | Hecho |
| 2 | Base: módulo `server/etg`, Basic Auth, errores `{code, error}`, logs, regla de la "Z" con husos de todo el mundo, migraciones aditivas con copia previa | Hecho |
| 3 | Modelos: mapeo de la flota a categorías ETG, sillas 0–3, upsell, ajustes configurables | Hecho (modelos y plazas por confirmar, ver DECISIONES) |
| 4 | `/search` (cobertura RD, anticipación, sin duplicados, precio de Tarifas) | Hecho |
| 5 | `/book` (idempotente, `order_id` corto, textos UTF-8 idénticos) | Hecho |
| 6 | `/status` y `/cancel` (penalidad, idempotencia, chofer/coche nunca `{}`) | Hecho |
| 7 | Autotests de ETG en local | **Hecho: 20 peticiones, 201/201 aserciones** |
| 8 | Staging en el VPS | Pendiente: DNS y app en Dokploy (DESPLIEGUE-ETG.md, pasos A y B) |
| 9 | Panel interno y portal ETG (rol `partner_etg`, detalle por orden, modificar, cancelar, chofer y vehículo, ajustes, flota, accesos, logs) | Hecho |
| 10 | Conexión con la web | Hecho: misma base, mismas Tarifas y flota; las órdenes ETG van en su sección del panel y avisan por correo |
| 11 | Producción | Pendiente de OK (DESPLIEGUE-ETG.md, paso C) |

## Pruebas (local)

- Autotests de ETG (newman): 20 peticiones, 201/201 aserciones.
- Casos borde propios (`node --test tests/etg/api.test.mjs`): 16/16, incluido el flujo del panel (chofer, precio y hora modificados que se ven en `/status`).
- Carga de `/search` (`tests/etg/load.mjs`): 2000 peticiones con 20 en paralelo, 0 errores, p95 ≈ 40 ms.
- Regresión de la web y el panel: build, catálogo, reserva web, login, reservas, excursiones y tarifas funcionan igual.
- Acceso del soporte de ETG: solo ve «Órdenes ETG». El resto de rutas del panel y de la API del panel le devuelve 403. El enlace directo a una orden abre la orden después del login.

## Pendiente de Dante o del cliente

- [ ] DNS: `staging`, `staging-api` y `api` (paso A).
- [ ] Crear la app de staging en Dokploy (paso B) con `.env.etg-staging`.
- [ ] Ejecutar los autotests contra staging, hacer las capturas y enviárselas a ETG junto con las credenciales.
- [ ] Confirmar la moneda y el ajuste de precio según el contrato con ETG.
- [ ] Confirmar el seguimiento de vuelo (completo, parcial o sin seguimiento).
- [ ] Confirmar los modelos reales y las plazas del sedán (3) y del VIP (4).
- [ ] Correo del soporte de ETG, para crearle el acceso al portal.
- [ ] OK para producción (paso C).
