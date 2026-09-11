# Dominican Routes — imagen para el VPS (Dokploy construye a partir de aqui).
#
# bookworm-slim y no alpine: better-sqlite3 y sharp traen codigo nativo, y en
# alpine (musl) toca compilarlos a mano. Con Debian bajan precompilados; los
# compiladores quedan solo por si algun binario no existiera para esta version.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras no cambie el lock.
# Sin --omit=dev porque tsx y typescript hacen falta para compilar y arrancar.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

# Base SQLite y fotos del panel. Montar un volumen aqui o se pierden al redesplegar.
VOLUME ["/app/data"]

EXPOSE 3000

# El seed solo siembra si la base esta vacia; si falla o se salta, la web
# arranca igual (con la base que hubiera).
CMD ["sh", "-c", "npm run db:seed || echo 'Seed omitido'; exec npm run server"]
