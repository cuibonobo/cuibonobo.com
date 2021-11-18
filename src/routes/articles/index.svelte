<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getPostsByType } from '@lib/fs';
  import { PostTypeName } from '@lib/types';

  export const load: Load = async ({ page }) => {
    try {
      const posts = await getPostsByType(PostTypeName.Article);
      return {
        props: {
          items: posts.map((post) => {
            return {
              slug: post.content['slug'],
              title: post.content['title'],
              created: post.created,
              tags: post.content['tags'],
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
