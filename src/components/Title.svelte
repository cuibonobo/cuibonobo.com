<script lang="ts">
  import MetaTitle from './MetaTitle.svelte';

  export let title: string;
  export let pageTitle = title;
  export let overrideDefaultPageTitle = false;
</script>

<MetaTitle title={pageTitle} overrideDefault={overrideDefaultPageTitle} />
<h2 class="main-title">{title}</h2>
