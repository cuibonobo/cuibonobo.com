<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getPostsByType } from '@lib/fs';
  import { PostTypeName } from '@lib/types';

  export const load: Load = async ({ page }) => {
    try {
      const posts = await getPostsByType(PostTypeName.Ephemera);
      return {
        props: {
          items: posts.map((post) => {
            return {
              created: post.created,
              text: post.content.text
            };
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
  import Article from '@components/Article.svelte';
  import DisplayDate from '@components/DisplayDate.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let items: { created: Date; text: string }[];
</script>

<Article title="Ephemera">
  {#each items as item}
  <div class="collection-item">
    <Markdown markdown={item.text} />
    <div class="article-metadata">
      <DisplayDate date={item.created} showTime={true} />
    </div>
  </div>
{/each}
</Article>
