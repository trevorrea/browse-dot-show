import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import { json5Plugin } from 'vite-plugin-json5'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), json5Plugin(), react()],
}) 