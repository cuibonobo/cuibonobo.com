<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItem, getPageData } from '../lib/fs';

  export const load: Load = async ({ page }) => {
    // the `slug` parameter is available because this file
    // is called [slug].svelte
    const { slug } = page.params;
    try {
      const fileData = await getMarkdownItem(['pages'], slug);
      if ('redirect' in fileData.data) {
        return {
          status: 301,
          redirect: fileData.data.redirect
        };
      }
      return {
        props: getPageData(fileData)
      };
    } catch (e) {
      return {
        status: 404,
        error: `Not found: ${page.path}`
      };
    }
  };
</script>

<script>
  import Title from '../components/Title.svelte';
  import Markdown from '../components/Markdown.svelte';

  export let title: string, content: string;
</script>

<Title {title} />
<article><Markdown markdown={content} /></article>
