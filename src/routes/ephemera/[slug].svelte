<script context="module" lang="ts">
  import { loadEphemeron } from '@lib/svelte';
  export const load = loadEphemeron;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let id: string, created: Date, updated: Date | null, text: string;
</script>

<Article title="Ephemera {id}" displayTitle={false} {created} {updated}>
  <Markdown markdown={text} />
</Article>
