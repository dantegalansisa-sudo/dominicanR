# Dominican Routes — ficha técnica para el despliegue en Hostinger VPS

Pega este archivo entero en el chat. Contiene todo lo que hace falta saber del
proyecto para guiar la conexión con el VPS y el dominio del cliente.

## Qué es

Web comercial de traslados y excursiones en Punta Cana. Hoy está publicada en
Vercel (`https://dominican-r.vercel.app`) y se va a mover a un **VPS de
Hostinger** con el dominio del cliente. No es un sitio estático: tiene un
servidor Node propio que debe quedarse corriendo.

- Repositorio: `https://github.com/dantegalansisa-sudo/dominicanR.git`, rama `main`.
- Front: React 19 + TypeScript + Vite 8. `npm run build` genera la carpeta `dist/`.
- Back: Express 5 en `server/index.ts`, ejecutado con `tsx` (`npm run server`).
  Sirve `dist/`, las rutas `/api/*`, las fotos subidas en `/uploads/*` y un
  `/health` que responde `{"ok":true}`.
- Base de datos: **SQLite** en un solo archivo (`data/dominican-routes.db`),
  con `better-sqlite3`. No hace falta instalar MySQL ni PostgreSQL.
- Fotos que sube el cliente desde el panel: `data/uploads/` (procesadas con
  `sharp`). La carpeta `data/` **no** está en git y no debe borrarse nunca.
- Node **24** (desarrollado con v24.12.0). Node 20 o 22 también valen.
- Puerto por defecto: **3000** (variable `PORT`).

## Variables de entorno (archivo `.env` en la raíz del proyecto)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `SESSION_SECRET` | Sí | Firma la cookie del panel. Mínimo 32 caracteres. Generar con `openssl rand -hex 32`. Si falta, el servidor no arranca. |
| `GOOGLE_PLACES_API_KEY` | Sí | Autocompletado de direcciones y cálculo de km. Ya existe en Vercel; hay que copiar la misma. Debe llevar restricción por API (Places API New + Routes API), no por dominio, porque se usa desde el servidor. |
| `RESEND_API_KEY` | Sí | Envío de correos de reserva y contacto. |
| `CONTACT_TO` | Sí | Correo que recibe las reservas: `dominicanroutes@gmail.com`. |
| `CONTACT_FROM` | Sí | Remitente. Con dominio verificado en Resend: `Dominican Routes <reservas@DOMINIO>`. |
| `NODE_ENV` | Sí | `production` (activa la cookie segura del panel; requiere HTTPS). |
| `PORT` | No | Por defecto 3000. |
| `DATA_DIR` | No | Dónde guardar la base y las fotos. Por defecto `./data`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo la primera vez | Crean el usuario del panel al ejecutar `npm run db:seed`. |

## Comandos, en orden, la primera vez en el VPS

```bash
git clone https://github.com/dantegalansisa-sudo/dominicanR.git dominican-routes
cd dominican-routes
npm install            # sin --omit=dev: tsx y typescript hacen falta para build y server
cp .env.example .env   # y rellenar las variables de arriba
npm run build          # genera dist/
npm run db:seed        # crea data/dominican-routes.db con las 38 excursiones, 8 vehículos y precios
npm run server         # arranca en el puerto 3000
```

`db:seed` solo siembra si la base está vacía: ejecutarlo de nuevo no borra nada.

## Con Dokploy (build por Dockerfile, Traefik con HTTPS)

El repo ya trae `Dockerfile` y `.dockerignore`. En Dokploy:

1. Aplicación nueva → fuente GitHub, rama `main`, tipo de build **Dockerfile**.
2. Variables de entorno: las de la tabla de arriba. `NODE_ENV`, `PORT` y
   `DATA_DIR` ya vienen fijadas en la imagen (`production`, `3000`, `/app/data`).
3. **Volumen persistente** montado en `/app/data` (base SQLite + fotos). Sin
   esto cada redespliegue arranca con la base vacía y sin fotos.
4. Dominio del cliente apuntando al puerto **3000** del contenedor, con HTTPS
   (Let's Encrypt) activado en Traefik. El servidor ya lleva `trust proxy`.
5. El contenedor ejecuta `npm run db:seed` (solo siembra si la base está
   vacía) y después `npm run server`.

Lo que sigue (PM2 + Nginx) es la alternativa sin Docker; con Dokploy no hace falta.

## Sin Docker: lo que hay que montar a mano en el VPS

1. **Node 24** (vía `nvm` o NodeSource) y `git`.
2. **PM2** para que `npm run server` quede corriendo y se reinicie al reiniciar
   el VPS: `pm2 start npm --name dominican-routes -- run server`, `pm2 save`,
   `pm2 startup`.
3. **Nginx** como proxy inverso: el dominio del cliente → `http://127.0.0.1:3000`.
   Debe pasar `Host`, `X-Forwarded-Proto` y admitir subidas de hasta 12 MB
   (`client_max_body_size 15m`) porque el panel sube fotos.
4. **HTTPS** con Let's Encrypt (`certbot --nginx`). Necesario: la cookie del
   panel es `secure` en producción y sin HTTPS no se podrá iniciar sesión.
5. **DNS** en Hostinger: registro `A` del dominio (y `www`) a la IP del VPS.
6. **Copia de seguridad**: basta con copiar la carpeta `data/` (base + fotos).
   Un cron diario con `tar` o `rsync` es suficiente.
7. **Actualizar la web** cuando haya cambios en GitHub:
   `git pull && npm install && npm run build && pm2 restart dominican-routes`.

## Cosas a tener en cuenta

- Las rutas internas de React (`/reservar`, `/excursiones`, `/reservar-excursion`)
  las resuelve el propio servidor Node devolviendo `index.html`; Nginx solo
  tiene que hacer proxy de todo, no hace falta configurar `try_files`.
- `vercel.json` y la carpeta `api/` son de Vercel; en el VPS no se usan
  directamente (el servidor Express reutiliza los mismos manejadores). No hay
  que borrarlos.
- El panel de administración (`/api/admin/*`) tiene el backend hecho; la
  interfaz web está pendiente. Para el despliegue no cambia nada.
- Cuando el dominio ya resuelva al VPS, verificar el dominio en Resend y
  cambiar `CONTACT_FROM` a una dirección de ese dominio para que los correos no
  salgan de `onboarding@resend.dev`.
- Vercel se puede dejar activo hasta comprobar que el VPS funciona, y después
  apagar el proyecto.

## Cómo comprobar que quedó bien

- `curl https://DOMINIO/health` → `{"ok":true}`
- `curl https://DOMINIO/api/catalog` → JSON con `excursions` (38) y `fleet` (8).
- Abrir la web, escribir un origen en el buscador y ver que aparecen
  sugerencias de Google.
- Enviar una reserva de prueba y confirmar que llega el correo.
