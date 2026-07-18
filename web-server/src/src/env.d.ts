declare namespace App {
	type Locals = {
		nonce: string;
	};
}

// Merges with the `ImportMetaEnv` interface declared in astro/client.d.ts,
// so this must stay an `interface` (a `type` alias cannot participate in
// declaration merging).
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMetaEnv {
	readonly PUBLIC_API_ORIGIN?: string;
	readonly API_ORIGIN?: string;
}
