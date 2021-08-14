<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItem, getPageData } from '../lib/fs';

  export const load: Load = async ({ page }) => {
    // the `slug` parameter is available because this file
    // is called [slug].svelte
    const { slug } = page.params;
    try {
      const fileData = await getMarkdownItem(['pages'], slug);
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
  import MetaTitle from '../components/MetaTitle.svelte';

  export let title: string, published: Date, content: string;
</script>

<MetaTitle title="{title} | cuibonobo" />

<h2>{title}</h2>
<div>{published}</div>
<div>{@html content}</div>
