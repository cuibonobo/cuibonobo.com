<script context="module" lang="ts">
  import { loadPage } from '@lib/svelte';
  export const load = loadPage;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let title: string, text: string;
</script>

<Article {title} pageTitle="cuibonobo" overrideDefaultPageTitle={true}>
  <Markdown markdown={text} />
</Article>
