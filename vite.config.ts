import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cloudflare } from '@cloudflare/vite-plugin'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const commitSha = process.env.WORKERS_CI_COMMIT_SHA
const appVersion = process.env.VITE_APP_VERSION ?? commitSha?.slice(0, 7) ?? pkg.version

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_CHANNEL__: JSON.stringify(process.env.VITE_APP_CHANNEL ?? 'BETA'),
    },
    plugins: [vue(), cloudflare()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    environments: {
      client: {
        build: {
          target: 'esnext',
          rollupOptions: {
            input: {
              main: resolve(__dirname, 'index.html'),
            },
          },
        },
      },
    },
  }
})
