# Integración ETG · Despliegue (staging y producción)

Nada de esto toca producción hasta el paso **C**, que requiere OK explícito.
La app actual (dominicanroutes.com) sigue desplegándose sola desde `main`;
el código de ETG está en la rama `feature/etg-integration`.

---

## A. DNS (Hostinger → Dominios → dominicanroutes.com → DNS)

Crear registros **A** apuntando a **la misma IP que ya tiene `dominicanroutes.com`**
(mira el registro A de `@`). TTL por defecto.

| Nombre | Tipo | Valor | Para |
|---|---|---|---|
| `staging` | A | IP del VPS | panel y web de staging (el enlace de cada orden de prueba) |
| `staging-api` | A | IP del VPS | API de staging, la que prueba ETG |
| `api` | A | IP del VPS | API de producción (se puede crear ya; no responde hasta el paso C) |

Comprobar con `nslookup staging-api.dominicanroutes.com` (tarda de minutos a pocas horas).

## B. Staging en Dokploy (app nueva; no se toca la de producción)

1. **Dokploy → el proyecto de Dominican Routes → Create Service → Application**.
   Nombre: `dominican-routes-staging`.
2. **General → Provider:** GitHub, repo `dantegalansisa-sudo/dominicanR`,
   rama **`feature/etg-integration`**. Build Type: **Dockerfile** (el mismo del repo).
   Activa "Autodeploy" si quieres que cada push a la rama se despliegue.
3. **Environment:** pega el contenido de `.env.etg-staging`, que está en la raíz de la copia de trabajo. No está en git.
   Opcional: `GOOGLE_PLACES_API_KEY`, para que la web de staging tenga autocompletado.
   **No** pongas las claves de PayPal ni `RESEND_API_KEY` de producción.
4. **Advanced → Volumes → Add Volume:** tipo *Volume Mount*, nombre
   **`dominican-routes-staging-data`**, ruta de montaje **`/app/data`**.
   (Tiene que ser un volumen nuevo. **No** uses `dominican-routes-data`, que es el de producción.)
5. **Domains → Add Domain**, dos veces:
   - Host `staging.dominicanroutes.com`, path `/`, puerto **3000**, HTTPS activado, certificado Let's Encrypt.
   - Host `staging-api.dominicanroutes.com`, path `/`, puerto **3000**, HTTPS activado, certificado Let's Encrypt.
6. **Deploy.** Al arrancar crea su base desde cero: `db:seed` con las tarifas y la flota por defecto, más las tablas de ETG.
7. **Comprobar:**
   ```bash
   curl https://staging.dominicanroutes.com/health
   curl -u 'USUARIO:CLAVE' -X POST https://staging-api.dominicanroutes.com/search \
     -H 'Content-Type: application/json' \
     -d '{"passengers":2,"start_date_time":"2027-01-15T14:00:00Z","start_point":{"type":"iata","iata":"PUJ"},"end_point":{"type":"coordinates","coordinates":{"lat":18.6892,"lon":-68.4486},"address":"Hotel Riu Palace Bávaro"}}'
   ```
8. Entrar a `https://staging.dominicanroutes.com/admin` con `ADMIN_EMAIL` y la
   `ADMIN_PASSWORD` de `.env.etg-staging`. Luego, en **ETG → Ajustes y flota → Acceso para el soporte de ETG**,
   crear el acceso de ETG. La contraseña se muestra una sola vez.

> Si quieres las tarifas reales en staging, vuelve a cargarlas en el panel de
> staging, o pídeme un export solo de tarifas. **No copies la base de producción:**
> tiene reservas con datos personales de clientes.

## Autotests de ETG (Postman / newman)

- Colección con "Search 1" ya apuntando a **PUJ → hotel en Bávaro**:
  `docs/etg/postman/etg-autotests-dominican-routes.postman_collection.json`
- Entorno: `docs/etg/postman/staging.postman_environment.json`. Rellena `login` y `password` con los de `.env.etg-staging`.
  Las variables que usa la colección son `URL`, `login` y `password`.
- En Postman: importar los dos archivos → Run collection. Haz la captura del resultado (ETG pide screenshots).
- Por línea de comandos:
  ```bash
  npx newman@6 run docs/etg/postman/etg-autotests-dominican-routes.postman_collection.json -e docs/etg/postman/staging.postman_environment.json
  ```
- Pruebas de casos borde propias (sección 13):
  ```bash
  ETG_URL=https://staging-api.dominicanroutes.com ETG_USER=… ETG_PASSWORD=… \
  ADMIN_URL=https://staging.dominicanroutes.com ADMIN_EMAIL=… ADMIN_PASS=… node --test tests/etg/api.test.mjs
  ```
- Carga: `ETG_URL=… ETG_USER=… ETG_PASSWORD=… node tests/etg/load.mjs 2000 20`

## Qué se entrega a ETG (paso 3 de su proceso)

| | Staging | Producción |
|---|---|---|
| URL de la API | `https://staging-api.dominicanroutes.com` | `https://api.dominicanroutes.com` |
| Basic Auth | `ETG_API_USER` / `ETG_API_PASSWORD` de `.env.etg-staging` | los de `.env.etg-production` |
| Portal (supplier_link) | `https://staging.dominicanroutes.com/admin` + el acceso creado en el paso B.8 | `https://dominicanroutes.com/admin` + un acceso creado en producción |

Envía las credenciales por un canal seguro, no por el mismo correo que la URL.

---

## C. Producción (requiere OK explícito; los comandos quedan listos)

Antes: autotests al 100 % contra staging y visto bueno de ETG.

1. **Copia de la base de producción**, desde la terminal del VPS:
   ```bash
   docker run --rm -v dominican-routes-data:/data:ro -v "$PWD":/out alpine \
     cp /data/dominican-routes.db /out/prod-antes-de-etg-$(date +%F).db
   ```
   Además, la propia app hace la copia `pre-etg-*.db` en `data/backups` al migrar.
2. **Variables:** en Dokploy → app de producción → Environment, **añade** las líneas de `.env.etg-production` sin borrar nada de lo que hay.
3. **Dominio:** en Dokploy → app de producción → Domains → **Add Domain** `api.dominicanroutes.com`, puerto 3000, HTTPS y Let's Encrypt.
   No toques los dominios existentes.
4. **Código:** fusiona `feature/etg-integration` en `main` (PR en GitHub). Dokploy despliega solo, como en cada cambio.
   La migración es aditiva y crea tablas y columnas nuevas.
5. **Comprobar:**
   - `curl https://dominicanroutes.com/health`
   - la web: hacer una reserva de prueba y revisar el panel.
   - `curl -u … -X POST https://api.dominicanroutes.com/search …`
6. En el panel de producción: **ETG → Ajustes y flota**. Revisa la flota, los modelos reales y la moneda, y crea el acceso del soporte de ETG.

**Marcha atrás:** revierte el merge en `main`; Dokploy vuelve a desplegar la versión anterior.
Las tablas nuevas se quedan en la base sin molestar: nada existente las usa.
Para apagar solo la API sin tocar el código, quita `ETG_API_USER` y `ETG_API_PASSWORD` y redespliega.
