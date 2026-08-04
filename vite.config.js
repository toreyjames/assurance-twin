import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Dev-only emulation of Vercel's /api/*.js serverless function routing.
// Vercel auto-parses JSON request bodies into an object before handlers run;
// this mirrors that so local dev matches production behavior.
function vercelApiDevMiddleware() {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const fnName = req.url.split('?')[0].replace('/api/', '')
        const fnPath = path.resolve(__dirname, 'api', `${fnName}.js`)
        if (!fs.existsSync(fnPath)) return next()

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')

        req.body = undefined
        if (raw) {
          try { req.body = JSON.parse(raw) } catch { req.body = raw }
        }

        const vercelRes = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this },
          json(body) {
            res.statusCode = this.statusCode
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
          }
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${fnName}.js`)
          await mod.default(req, vercelRes)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev middleware error', detail: e.message }))
        }
      })
    }
  }
}

export default defineConfig({ plugins: [react(), vercelApiDevMiddleware()] })
