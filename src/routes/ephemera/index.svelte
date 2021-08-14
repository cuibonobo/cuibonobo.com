<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItems, getEphemeraData } from '@lib/fs';

  export const load: Load = async ({ page }) => {
    try {
      const files = await getMarkdownItems(['ephemera']);
      return {
        props: {
          items: files.map(({ fileData }) => {
            return getEphemeraData(fileData);
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
  import MetaTitle from '@components/MetaTitle.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let items: { published: Date; content: string }[];
</script>

<MetaTitle title="Ephemera | cuibonobo" />

<main class="prose">
  <h2>Ephemera</h2>
  <ul>
    {#each items as item}
      <li>{item.published}: <Markdown markdown={item.content} /></li>
    {/each}
  </ul>
</main>
