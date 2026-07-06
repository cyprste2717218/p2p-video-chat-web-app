// @ts-check
import {defineConfig} from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  ...(process.env.NODE_ENV==='dev'&&{site: 'https://distill-goldmine-cheddar.ngrok-free.dev'}),
  output: 'server',
  integrations: [react()],
  server: {
    host: true,
    port: 4321,
    ...(process.env.NODE_ENV==='dev'&&{
      allowedHosts: ['distill-goldmine-cheddar.ngrok-free.dev']
    })
  },
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
    ...(process.env.NODE_ENV==='dev'&&{
      server: {
        hmr: {
          host: 'distill-goldmine-cheddar.ngrok-free.dev',
          clientPort: 443,
          protocol: 'wss'
        },
        origin: 'https://distill-goldmine-cheddar.ngrok-free.dev',
        proxy: {
          '/call': {target: 'http://host.docker.internal:3000',changeOrigin: true},
          '/wss': {target: 'http://host.docker.internal:3000',changeOrigin: true,ws: true},
          '/auth': {target: 'http://host.docker.internal:3000',changeOrigin: true}
        }
      }
    })
  },

  adapter: node({
    mode: 'standalone'
  })
});