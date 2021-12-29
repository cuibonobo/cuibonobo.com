<script lang="ts">
  import '../tailwind.css';
  import MetaTitle from '@components/MetaTitle.svelte';
</script>

<MetaTitle title="cuibonobo" overrideDefault={true} />

<header
  id="top-bar"
  class="container justify-between flex flex-col md:flex-row py-2 px-4 md:p-4 mx-auto"
>
  <div class="brand inline-flex">
    <a href="/"><h1>cuibonobo</h1></a>
  </div>
  <nav id="main-menu" class="flex flex-wrap leading-loose">
    <a class="mr-2 md:mr-4" href="/">Home</a>
    <a class="mx-2 md:mx-4" href="/ephemera/">Ephemera</a>
    <a class="mx-2 md:mx-4" href="/articles/">Articles</a>
    <a class="ml-2 md:ml-4" href="/about/">About</a>
  </nav>
</header>

<main class="container mx-auto pt-2 pb-6 px-4 md:pt-4 md:pb-8">
  <slot />
</main>

<footer id="footer" class="container mx-auto py-2 px-4 md:p-4 grid grid-cols-1 md:grid-cols-2">
  <div class="grid grid-rows-2 mb-2">
    <nav class="mb-2">
      <a class="mr-2" href="/ephemera/">Ephemera</a> <a class="mr-2" href="/articles/">Articles</a>
      <a class="mr-2" href="/about/">About</a>
    </nav>
    <div class="mb-2">
      <a
        class="mr-2"
        href="https://twitter.com/cuibonobo"
        target="_blank"
        rel="me noopener noreferrer">Twitter</a
      >
      <a
        class="mr-2"
        href="https://github.com/cuibonobo"
        target="_blank"
        rel="me noopener noreferrer">GitHub</a
      >
      <a
        class="mr-2"
        href="https://instagram.com/cuibonobo"
        target="_blank"
        rel="me noopener noreferrer">Instagram</a
      >
    </div>
  </div>
  <div class="md:text-right">
    Except where otherwise noted, everything by <a href="/">cuibonobo</a> on this website is
    <a
      title="Creative Commons CC0"
      href="http://creativecommons.org/publicdomain/zero/1.0/"
      target="_blank"
      rel="noopener noreferrer">dedicated to the public domain</a
    >.
  </div>
</footer>
