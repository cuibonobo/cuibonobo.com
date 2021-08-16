<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItem, getArticleData } from '../../lib/fs';

  export const load: Load = async ({ page }) => {
    // the `slug` parameter is available because this file
    // is called [slug].svelte
    const { slug } = page.params;
    try {
      const fileData = await getMarkdownItem(['articles'], slug);
      return {
        props: getArticleData(fileData)
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
  import MetaTitle from '../../components/MetaTitle.svelte';
  import Markdown from '../../components/Markdown.svelte';

  export let title: string, published: Date, tags: string, content: string;
</script>

<MetaTitle title="{title} | cuibonobo" />

<h2>{title}</h2>
<div>{published}</div>
<div>{tags}</div>
<article><Markdown markdown={content} /></article>
