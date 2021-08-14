import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    defaults: {
      script: 'typescript'
    }
  }),
  kit: {
    files: {
      assets: 'static',
      routes: 'src/routes',
      template: 'src/index.html'
    },
    // hydrate the <div id="main"> element in src/app.html
    target: '#main',
    adapter: adapter({
      fallback: null
    }),
    hydrate: false,
    router: false,
    prerender: {
      crawl: true,
      enabled: true,
      onError: 'continue',
      pages: [
        '/',
        '/about',
        '/ephemera',
        '/articles/drawing-from-the-public-domain',
        '/articles/the-artist-formerly-known-as-jen-montes'
      ]
    }
  }
};

export default config;
