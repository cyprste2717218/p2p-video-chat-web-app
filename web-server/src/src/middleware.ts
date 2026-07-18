import crypto from 'node:crypto';
import {defineMiddleware} from 'astro:middleware';

function readEnvString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

export const onRequest = defineMiddleware(async (context, next) => {
	// Generate a unique 128-bit cryptographic token encoded as base64
	const nonce = crypto.randomBytes(16).toString('base64');

	// Make the nonce token available inside Astro components via Astro.locals
	context.locals.nonce = nonce;

	const response = await next();

	// CSP is dev-incompatible (Vite HMR/dev toolbar scripts have no nonce)
	if (import.meta.env.DEV) return response;

	// Stamp nonce onto every <script and <style tag Astro injects into the HTML
	// so they satisfy the 'nonce-...' CSP directive
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('text/html')) {
		return response;
	}

	const originalBody = await response.text();
	const patchedBody = originalBody
		.replaceAll(/<script(?=[\s>])/gv, `<script nonce="${nonce}"`)
		.replaceAll(/<style(?=[\s>])/gv, `<style nonce="${nonce}"`)
		.replaceAll(/<link(?=[\s>])/gv, `<link nonce="${nonce}"`);

	// Define the strict-dynamic CSP header policy
	const apiOrigin =
		readEnvString(import.meta.env.PUBLIC_API_ORIGIN) ??
		readEnvString(import.meta.env.API_ORIGIN) ??
		'http://localhost:3000';
	// Extract the hostname to allow WebSocket connections on any port (per-call WS servers use random ports)
	const wsHost = new URL(apiOrigin).hostname;
	const wsOrigin = `ws://${wsHost}:*`;

	const cspHeader =
		`script-src 'nonce-${nonce}' 'strict-dynamic'; style-src-elem 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; worker-src 'self'; connect-src 'self' ${apiOrigin} ${wsOrigin}; object-src 'none'; base-uri 'none';`.replaceAll(
			'\n',
			' ',
		);

	// Create a mutable copy of the headers to avoid write-protection conflicts
	const modifiedHeaders = new Headers(response.headers);
	modifiedHeaders.set('Content-Security-Policy', cspHeader);
	// Update content-length since the body length changed
	modifiedHeaders.delete('content-length');

	return new Response(patchedBody, {
		status: response.status,
		statusText: response.statusText,
		headers: modifiedHeaders,
	});
});
