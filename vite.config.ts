import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Two pages: Way Out (control room + #/rider) and the SafeRide map.
  input: { main: 'index.html', saferide: 'saferide.html' },
})
