import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Material Symbols Rounded, as in the app: `~icons/material-symbols/<name>-rounded`.
  plugins: [react(), tailwindcss(), Icons({ compiler: 'jsx', jsx: 'react' })],
  // The server's .env.example allows CORS from http://localhost:5173 only.
  server: { port: 5173, strictPort: true },
})
