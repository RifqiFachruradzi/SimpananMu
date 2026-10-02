import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel function in api/chat.js during `npm run dev`, so the AI
// chat works locally with GEMINI_API_KEY set in .env.local.
const apiDevServer = () => ({
  name: 'api-dev-server',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res) => {
      const { default: handler } = await server.ssrLoadModule('/api/chat.js')
      await handler(req, res)
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), apiDevServer()],
  }
})
