<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItems, getArticleData } from '../../lib/fs';

  export const load: Load = async ({ page }) => {
    try {
      const files = await getMarkdownItems(['articles']);
      return {
        props: {
          items: files.map(({ slug, fileData }) => {
            return { slug, data: getArticleData(fileData) };
          })
        }
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

  export let items: {
    slug: string;
    data: { content: string; title: string; published: Date; tags: string };
  }[];
</script>

<MetaTitle title="Articles | cuibonobo" />

<h2>Articles</h2>
<ul>
  {#each items as item}
    <li><a href="/articles/{item.slug}/">{item.data.title}</a></li>
  {/each}
</ul>
