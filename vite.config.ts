import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleContact } from './api/_contact.ts'
import { handlePlaces } from './api/_places.ts'

type Handler = (payload: unknown) => Promise<{ status: number; body: unknown }>

// El servidor de desarrollo de Vite no sirve el directorio api/, así que
// montamos los mismos manejadores como middleware. En local se ejerce la
// validación real y la llamada real a Google o a Resend: solo cambia el
// transporte respecto a producción.
function jsonApi(route: string, handle: Handler): Plugin {
  return {
    name: `dev-api${route.replace(/\//g, '-')}`,
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') {
          send(405, { ok: false, error: 'Método no permitido.' })
          return
        }
        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
          if (raw.length > 100_000) req.destroy()
        })
        req.on('end', async () => {
          let payload: unknown = {}
          try {
            payload = JSON.parse(raw || '{}')
          } catch {
            send(400, { ok: false, error: 'Solicitud inválida.' })
            return
          }
          const { status, body } = await handle(payload)
          send(status, body)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Las claves de servidor no llevan prefijo VITE_ a propósito: así Vite nunca
  // las mete en el bundle. Pero entonces tampoco las carga sola, y los
  // manejadores las leen de process.env, así que las pasamos aquí a mano.
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['GOOGLE_PLACES_API_KEY', 'RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM']) {
    if (env[k]) process.env[k] = env[k]
  }

  return {
    plugins: [
      react(),
      jsonApi('/api/contact', handleContact),
      jsonApi('/api/places', handlePlaces),
    ],
  }
})
