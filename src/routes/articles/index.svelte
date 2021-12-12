<script context="module" lang="ts">
  import { loadArticles } from '@lib/svelte';
  export const load = loadArticles;
</script>

<script lang="ts">
  import Article from '@components/Article.svelte';

  export let items: {
    slug: string;
    text: string;
    title: string;
    created: Date;
    tags: string;
  }[];
</script>

<Article title="Articles">
  <ul>
    {#each items as item}
      <li><a href="/articles/{item.slug}/">{item.title}</a></li>
    {/each}
  </ul>
</Article>
