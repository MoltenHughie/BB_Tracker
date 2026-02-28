import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// SPA fallback so client-side routing works on static hosts
			fallback: '200.html'
		}),
		prerender: {
			// SPA mode: don't try to prerender every route (server loads will be removed in Phase 1)
			entries: []
		}
	}
};

export default config;
