import {defineMiddleware} from 'astro:middleware';
import crypto from 'node:crypto';

export const onRequest=defineMiddleware(async (context,next) => {
	// Generate a unique 128-bit cryptographic token encoded as base64
	const nonce=crypto.randomBytes(16).toString('base64');

	// Make the nonce token available inside Astro components via Astro.locals
	context.locals.nonce=nonce;

	const response=await next();

	// CSP is dev-incompatible (Vite HMR/dev toolbar scripts have no nonce)
	if (import.meta.env.DEV) return response;

	// Define the strict-dynamic CSP header policy
	const cspHeader=`script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`;

	// Create a mutable copy of the headers to avoid write-protection conflicts
	const modifiedHeaders=new Headers(response.headers);
	modifiedHeaders.set('Content-Security-Policy',cspHeader);

	return new Response(response.body,{
		status: response.status,
		statusText: response.statusText,
		headers: modifiedHeaders
	});
});
