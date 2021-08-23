<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { getMarkdownItems, getEphemeraData } from '../../lib/fs';

  export const load: Load = async ({ page }) => {
    try {
      const files = await getMarkdownItems(['ephemera']);
      return {
        props: {
          items: files.map(({ fileData }) => {
            return getEphemeraData(fileData);
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

<script>
  import Title from '../../components/Title.svelte';
  import PublishedDate from '../../components/PublishedDate.svelte';
  import Markdown from '../../components/Markdown.svelte';

  export let items: { published: Date; content: string }[];
</script>

<Title title="Ephemera" />
<ul>
  {#each items as item}
    <li>
      <PublishedDate published={item.published} displayInline={true} showTime={true} />: <Markdown
        markdown={item.content}
      />
    </li>
  {/each}
</ul>
