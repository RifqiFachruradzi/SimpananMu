import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel functions in api/*.js during `npm run dev` (e.g. /api/data →
// api/data.js), so login, sync and the AI chat work locally with the variables
// from .env.local.
const apiDevServer = () => ({
  name: 'api-dev-server',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const match = /^\/api\/([a-z]+)(?:[/?]|$)/.exec(req.url || '')
      if (!match) return next()
      try {
        const { default: handler } = await server.ssrLoadModule(`/api/${match[1]}.js`)
        await handler(req, res)
      } catch (err) {
        if (err?.code === 'ERR_LOAD_URL' || /Failed to load url/.test(err?.message)) return next()
        throw err
      }
    })
  },
})

const SERVER_ENV = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'BUDDY_DAILY_LIMIT', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), apiDevServer()],
  }
})
