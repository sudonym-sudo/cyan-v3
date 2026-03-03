import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    viteSingleFile(),
    {
      name: 'suppress-epoxy-warning',
      transform(code, id) {
        if (id.includes('epoxy-transport')) {
          return code.replace(
            'new URL("epoxy.wasm", import.meta.url)',
            'new URL(/* @vite-ignore */ "epoxy.wasm", import.meta.url)'
          );
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        app: './index.html'
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://cyan-data.vercel.app',
        changeOrigin: true,
        buffer: false,
        timeout: 1000 * 60 * 60 * 12, // 12 hours
      },
    },
  },
})
