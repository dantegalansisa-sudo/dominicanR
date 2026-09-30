# Integración ETG · Decisiones y supuestos

Qué se asumió, por qué y dónde se cambia. Todo lo "configurable" se edita en el
panel (**ETG → Ajustes y flota**) o, si se quiere fijar por servidor, con la
variable de entorno indicada (la variable manda sobre el panel).

## Arquitectura

| Tema | Decisión | Motivo |
|---|---|---|
| Stack y base | La API vive **dentro de la app actual** (Express + SQLite), en `server/etg/`. No hay Postgres ni servicio aparte. | El informe pide el mismo stack y la misma base. Las pruebas de carga dan p95 ≈ 40 ms en `/search` (objetivo < 1 s), así que no hace falta un servicio separado. |
| Rutas | En los dominios de `ETG_API_HOSTS` (`api.…`, `staging-api.…`) la API responde en la raíz: `/search`, `/book`, `/status`, `/cancel`. En cualquier dominio responde también bajo `/etg-api`. | ETG exige esos paths exactos. `/etg-api` sirve para probar en local y como alternativa si no se crea el subdominio. |
| Web actual | No cambia: en `dominicanroutes.com` nada pasa por el router de ETG. | Regla 2 del informe. |
| Panel / portal | Sección **ETG** dentro del panel actual (`/admin/etg/…`), sin subdominio `admin.`. El soporte de ETG entra con rol `partner_etg` y solo ve sus órdenes. | Regla 5: extender el panel existente. El subdominio `admin.` no aporta nada y exigiría otro registro DNS. |
| `supplier_link` | `ETG_PUBLIC_URL/admin/etg/orders/<order_id>` (prod: `https://dominicanroutes.com/…`, staging: `https://staging.dominicanroutes.com/…`). | Enlace a esa orden concreta; si no hay sesión, pide login y después la abre. |
| Base de datos | Solo cambios aditivos: tablas `etg_searches`, `etg_orders`, `etg_order_changes`, `etg_api_logs` y columnas `etg_*` (con default) en `vehicles`. Copia `data/backups/pre-etg-*.db` automática antes de la primera migración. | Regla 3. |
| Staging | Segunda app en Dokploy, desde la rama `feature/etg-integration`, con **su propio volumen** (su propia base). | Nunca apunta a la base de producción. |
| Copias | Copia diaria en caliente de SQLite en `data/backups/daily-AAAA-MM-DD.db` (se guardan 14). `DB_DAILY_BACKUP=0` la desactiva. | El informe pide `pg_dump` diario; con SQLite el equivalente es la API de backup. |

## Reglas comerciales (valores por defecto, sección 15 del informe)

| Dato | Valor | Dónde se cambia |
|---|---|---|
| Moneda | `USD` | `ETG_CURRENCY` / panel. **Confirmar con el contrato.** |
| Precio | El de la web (Tarifas: rutas cerradas, tramos por km y recargos por zona), **solo ida**, + `ETG_PRICE_MARKUP_PERCENT` (0). | Tarifas del panel / variable o panel. **Confirmar con el contrato.** |
| Anticipación mínima | 12 h | panel |
| Cancelación gratis | Hasta 24 h antes; después, 100 % del precio (nunca más del precio). | panel (horas y %) |
| Espera incluida | Aeropuerto 60 min; otros puntos 15 min | panel |
| Vida de una oferta | 26 h (mínimo contractual 24 h); si el viaje es antes, hasta el límite de anticipación. | panel |
| Peajes / propina | `tolls_included: true`, `gratuity_included: false` | panel |
| Seguimiento de vuelo | **Completo** (`flight_number` o `"No flight"`), `buffer_time_minutes = 0` | panel. **Pendiente de que el cliente elija.** |
| Instrucciones de encuentro | Texto genérico en inglés; solo en recogidas en aeropuerto. | panel |
| Aeropuertos | PUJ, SDQ, STI, POP, LRM, AZS, JBQ | panel (chips) |

## Flota (mapeo a categorías de ETG)

Precio siempre el de Tarifas. Modelos: **los de referencia de ETG** mientras el
cliente no dé los reales (ETG exige marca y modelo de la flota, sin "or similar").

| Vehículo web | En ETG | Categoría | Plazas | Maletas | Modelos (provisionales) |
|---|---|---|---|---|---|
| Sedán | sí | economy | **3** | 2 | Toyota Corolla, Hyundai Elantra |
| Miniván | sí | economy_van | 6 | 6 | Toyota Sienna, Honda Odyssey |
| Minibús | sí | minibus | 11 | 11 | Toyota Hiace, Hyundai H1 |
| VIP Luxury | sí | business_mpv | **4** | 4 | Chevrolet Suburban, GMC Yukon |
| Bus, Autobús | no | bus | 22 / 50 | — | sin tarifa en la web (se cotizan a mano) |
| Limusina, Miniván accesible | no | — | — | — | no encajan en categorías de ETG |

**A confirmar por el cliente:**
- **Sedán con 3 plazas.** La web lo vende para 2 personas, pero ETG exige 3–4 plazas en `economy`. Si el sedán no lleva 3, hay que desactivarlo en ETG o pasarlo a `micro` (2–3 plazas), aunque `micro` es para coches pequeños.
- **VIP Luxury con 4 plazas.** La web dice 6, pero ETG limita `business_mpv` a 4. Si lleva 6, iría como `business_van` (4–7), cuyos modelos de referencia son Mercedes V Class o Vito.
- **Modelos reales** de cada vehículo.

## Detalles técnicos

- **Hora "Z"**: se toma como hora local del punto de recogida y se devuelve igual con su desfase. El huso sale del aeropuerto (OpenFlights, `server/etg/data/airports.json`) o de las coordenadas (`@photostructure/tz-lookup`). Vale también fuera de RD: los autotests de ETG lo comprueban con Yakarta, Bali, Honolulu, Culiacán y Bangkok.
- **Cobertura**: los dos puntos tienen que estar en RD (huso `America/Santo_Domingo`) y el aeropuerto activo. Si no la hay, la respuesta es `200` con `offers: []`.
- **Distancia y duración**: línea recta × 1,3 y 50 km/h, configurables. **No se usa Google**: con 80 000 búsquedas al día costaría cientos de dólares diarios. El precio no depende de esta cifra cuando hay ruta cerrada.
- **Zonas por coordenadas**: ETG a menudo manda solo el nombre del hotel. Para que se apliquen los recargos por zona de la web, se añade la zona según centros aproximados (`ZONE_CENTERS` en `server/etg/points.ts`).
- **Sillas de niño**: los tipos 0–3 están siempre disponibles, al precio de la silla de la web (US$10). `max_count = plazas − 1`. El precio de la oferta incluye solo las sillas pedidas.
- **Upsell adicional**: `water_bottle` con precio 0. La regla del contrato es que el precio de `/book` sea idéntico al de la oferta, así que un upsell con precio crearía una contradicción.
- **`order_id`**: `DR` + 6 caracteres sin ambigüedades (sin 0/O ni 1/I/L), por ejemplo `DR7KBN4Q`.
- **`pin_code`**: no se envía. Es opcional y el cliente no tiene ese proceso.
- **Auth inválida**: `401` con `{code, error}`, que es lo estándar en Basic Auth. Los errores de negocio o de formato son `500` con `{code, error}`, como pide ETG.
- **Búsquedas guardadas**: una fila por búsqueda, comprimida con brotli (≈ 0,7 KB), que se borra al caducar. Los logs de `/search` guardan el request y el número de ofertas, salvo errores. Los logs se borran a los 30 días. Las órdenes no se borran nunca.
- **Avisos**: se envía un correo al equipo (`CONTACT_TO`) con cada orden nueva o cancelada de ETG. Sin `RESEND_API_KEY` no se envía nada.
- **Órdenes ETG en el panel**: tienen su propia sección, no se mezclan con "Reservas" de la web.
