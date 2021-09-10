import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
import tsconfigPaths from 'vite-tsconfig-paths';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),
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
    vite: {
      plugins: [tsconfigPaths()]
    },
    hydrate: false,
    router: false,
    prerender: {
      crawl: true,
      enabled: true,
      onError: 'continue',
      entries: ['*']
    }
  }
};

export default config;
