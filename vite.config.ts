import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleContact } from './api/_contact.ts'

// The Vite dev server does not serve the api/ directory, so wire the same
// handler in as middleware. Local submissions exercise the real validation and
// the real Resend call — only the transport differs from production.
function contactApi(): Plugin {
  return {
    name: 'contact-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/contact', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }))
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
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida.' }))
            return
          }
          const { status, body } = await handleContact(payload)
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contactApi()],
})
