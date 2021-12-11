<script lang="ts">
  import MetaTitle from './MetaTitle.svelte';

  export let title: string;
  export let displayTitle: boolean = true;
  export let pageTitle = title;
  export let overrideDefaultPageTitle = false;
</script>

<MetaTitle title={pageTitle} overrideDefault={overrideDefaultPageTitle} />
{#if displayTitle}
  <h2>{title}</h2>
{/if}
