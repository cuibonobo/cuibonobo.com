<script lang="ts">
  import Title from '@components/Title.svelte';
  import DisplayDate from '@components/DisplayDate.svelte';

  export let title: string;
  export let displayTitle: boolean = true;
  export let pageTitle: string = title;
  export let overrideDefaultPageTitle: boolean = false;
  export let created: Date | null = null;
  export let updated: Date | null = null;
  export let tags: string | null = null;
</script>

<article class="prose" aria-labelledby="accessible-semantic-html">
  <header>
    {#if created || tags}
    <div class="article-metadata">
      {#if created}
      <DisplayDate date={created} />
      {/if}
      {#if tags}
      <div>{tags}</div>
      {/if}
    </div>
    {/if}
    <Title {title} {displayTitle} {pageTitle} {overrideDefaultPageTitle} />
  </header>
  <section>
    <slot />
  </section>
  {#if updated && created && updated > created}
  <footer class="article-metadata mt-4">
    <DisplayDate date={updated} prefix="Updated on " itemProp="dateModified" />
  </footer>
  {/if}
</article>
  