<script context="module" lang="ts">
  import { loadError } from '@lib/svelte';
  export const load = loadError;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';

  export let status: string;
  export let message: string;
</script>

<Article title="Error: {status}">
  <p>{message}</p>
</Article>
