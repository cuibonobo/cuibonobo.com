<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getPostBySlug } from '@lib/fs';
  import { PostTypeName } from '@lib/types';

  export const load: Load = async ({ page }) => {
    // the `slug` parameter is available because this file
    // is called [slug].svelte
    const { slug } = page.params;
    try {
      const post = await getPostBySlug(slug, PostTypeName.Article);
      return {
        props: {
          title: post.content['title'],
          created: post.created,
          updated: post.updated,
          tags: post.content['tags'],
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

  export let title: string, created: Date, updated: Date | null, tags: string, text: string;
</script>

<Article {title} {created} {updated} {tags}>
  <Markdown markdown={text} />
</Article>
