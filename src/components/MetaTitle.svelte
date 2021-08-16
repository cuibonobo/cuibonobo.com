<script lang="ts">
  export let title: string;
  export let overrideDefault = false;
  const metaTitle = overrideDefault ? title : `${title} | cuibonobo`;
</script>

<svelte:head>
  <title>{metaTitle}</title>
</svelte:head>
