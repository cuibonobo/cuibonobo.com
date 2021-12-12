<script context="module" lang="ts">
  import { loadEphemera } from '@lib/svelte';
  export const load = loadEphemera;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';
  import DisplayDate from '@components/DisplayDate.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let items: { id: string; created: Date; text: string }[];
</script>

<Article title="Ephemera">
  {#each items as item}
    <div class="collection-item">
      <Markdown markdown={item.text} />
      <div class="article-metadata">
        <a href="/ephemera/{item.id}/"><DisplayDate date={item.created} showTime={true} /></a>
      </div>
    </div>
  {/each}
</Article>
