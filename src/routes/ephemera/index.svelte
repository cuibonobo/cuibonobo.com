<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItems, getEphemeraData } from '../../lib/fs';

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
  import Title from '../../components/Title.svelte';
  import PublishedDate from '../../components/PublishedDate.svelte';
  import Markdown from '../../components/Markdown.svelte';

  export let items: { published: Date; content: string }[];
</script>

<Title title="Ephemera" />
{#each items as item}
  <div class="collection-item">
    <Markdown markdown={item.content} />
    <div class="article-metadata">
      <PublishedDate published={item.published} displayInline={true} showTime={true} />
    </div>
  </div>
{/each}
