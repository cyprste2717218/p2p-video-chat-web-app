// @ts-check
import {defineConfig} from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
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
    plugins: [tailwindcss()]
  },

  adapter: node({
    mode: 'standalone'
  })
});