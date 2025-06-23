import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { parse } from 'jsonc-parser'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'

// Plugin to handle .jsonc files
function jsoncPlugin(): Plugin {
  return {
    name: 'vite-plugin-jsonc',
    enforce: 'pre',
    resolveId(id: string, importer?: string) {
      if (id.endsWith('.jsonc')) {
        if (importer && (id.startsWith('./') || id.startsWith('../'))) {
          return resolve(dirname(importer), id)
        }
        return id
      }
      return null
    },
    load(id: string) {
      if (id.endsWith('.jsonc')) {
        try {
          const content = readFileSync(id, 'utf-8')
          const parsed = parse(content)
          return `export default ${JSON.stringify(parsed)}`
        } catch (error) {
          this.error(`Failed to parse JSONC file: ${id}`)
        }
      }
      return null
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jsoncPlugin()],
}) 