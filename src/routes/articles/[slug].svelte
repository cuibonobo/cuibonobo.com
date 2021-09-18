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
  import Title from '@components/Title.svelte';
  import DisplayDate from '@components/DisplayDate.svelte';
  import Markdown from '@components/Markdown.svelte';

  export let title: string, created: Date, updated: Date | null, tags: string, text: string;
</script>

<div class="article-metadata">
  <DisplayDate date={created} />
  <div>{tags}</div>
</div>
<Title {title} />
<article><Markdown markdown={text} /></article>
{#if updated && updated > created}
  <div class="article-metadata mt-4">
    <DisplayDate date={updated} prefix="Updated on " itemProp="dateModified" />
  </div>
{/if}
