import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const server = `http://localhost:${env.SERVER_PORT || 3000}`

  return {
    plugins: [react()],
    server: {
      // Toda la API (contacto, Google, catálogo, pagos, panel) y las fotos
      // subidas viven en el servidor Express: `npm run server` en otra
      // terminal, con las variables del .env. Así en desarrollo pasa
      // exactamente lo mismo que en el VPS, reservas guardadas incluidas.
      proxy: {
        '/api': server,
        '/uploads': server,
      },
    },
  }
})
