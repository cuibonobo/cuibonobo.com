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

<script lang="ts">
  import Title from '@components/Title.svelte';
  import DisplayDate from '@components/DisplayDate.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let items: { created: Date; content: string }[];
</script>

<Title title="Ephemera" />
{#each items as item}
  <div class="collection-item">
    <Markdown markdown={item.content} />
    <div class="article-metadata">
      <DisplayDate date={item.created} showTime={true} />
    </div>
  </div>
{/each}
