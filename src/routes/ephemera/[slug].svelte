<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getPostById } from '@lib/fs';

  export const load: Load = async ({ page }) => {
    // the `slug` parameter is available because this file
    // is called [slug].svelte
    const { slug } = page.params;
    try {
      const post = await getPostById(slug);
      return {
        props: {
          id: post.id,
          created: post.created,
          updated: post.updated,
          text: post.content.text
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
  import Markdown from '@components/Markdown.svelte';

  export let id: string, created: Date, updated: Date | null, text: string;
</script>

<Article title="Ephemera {id}" displayTitle={false} {created} {updated}>
  <Markdown markdown={text} />
</Article>
