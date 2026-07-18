import globals from 'globals';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		// XO has no Astro parser (would need astro-eslint-parser + eslint-plugin-astro);
		// .astro files aren't valid standalone JS/TS so XO can't parse them.
		ignores: ['**/*.astro'],
	},
	{
		files: ['web-server/src/public/token-worker.js'],
		languageOptions: {
			globals: globals.worker,
		},
	},
];

export default xoConfig;
