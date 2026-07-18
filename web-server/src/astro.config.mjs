// @ts-check
import process from 'node:process';
import {defineConfig} from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	...(process.env.NODE_ENV === 'dev' &&
		process.env.LOCAL === 'false' && {
			site: `https://${process.env.NGROK_HOST}`,
		}),
	output: 'server',
	integrations: [react()],
	server: {
		host: true,
		port: 4321,
		...(process.env.NODE_ENV === 'dev' &&
			process.env.LOCAL === 'false' && {
				allowedHosts: [`${process.env.NGROK_HOST}`],
			}),
		...(process.env.NODE_ENV === 'dev' &&
			process.env.LOCAL === 'true' && {
				allowedHosts: ['localhost:4321'],
			}),
	},
	security: {
		checkOrigin: true,
	},
	vite: {
		plugins: [tailwindcss()],
		...(process.env.NODE_ENV === 'dev' &&
			process.env.LOCAL === 'true' && {
				server: {
					proxy: {
						'/call': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
						},
						'/ws': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
							ws: true,
						},
						'/auth': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
						},
					},
				},
			}),
		...(process.env.NODE_ENV === 'dev' &&
			process.env.LOCAL === 'false' && {
				server: {
					hmr: {
						host: `${process.env.NGROK_HOST}`,
						clientPort: 443,
						protocol: 'wss',
					},
					origin: `https://${process.env.NGROK_HOST}`,
					proxy: {
						'/call': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
						},
						'/wss': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
							ws: true,
						},
						'/auth': {
							target: 'http://host.docker.internal:3000',
							changeOrigin: true,
						},
					},
				},
			}),
	},

	adapter: node({
		mode: 'standalone',
	}),
});
