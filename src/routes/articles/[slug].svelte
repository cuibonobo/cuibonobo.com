<script context="module" lang="ts">
  import { loadArticle } from '@lib/svelte';
  export const load = loadArticle;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let title: string, created: Date, updated: Date | null, tags: string, text: string;
</script>

<Article {title} {created} {updated} {tags}>
  <Markdown markdown={text} />
</Article>
