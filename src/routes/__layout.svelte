<script>
  import '../tailwind.css';
  import MetaTitle from '../components/MetaTitle.svelte';
</script>

<MetaTitle title="cuibonobo" />

<header
  id="top-bar"
  class="container justify-between flex flex-col md:flex-row bg-white py-2 my-4 mx-auto"
>
  <div class="text-2xl font-bold inline-flex pl-2">
    <a class="px-2 py-1" href="/">cuibonobo</a>
  </div>
  <nav id="main-menu" class="flex flex-wrap pr-2">
    <a class="mx-2 px-2 py-1" href="/">Home</a>
    <a class="mx-2 px-2 py-1" href="/ephemera/">Ephemera</a>
    <a class="mx-2 px-2 py-1" href="/articles/">Articles</a>
    <a class="ml-2 px-2 py-1" href="/about/">About</a>
  </nav>
</header>

<div class="bg-white container mx-auto p-4">
  <main class="prose">
    <slot />
  </main>
</div>

<footer class="container mx-auto p-4 md:px-0 grid grid-cols-1 md:grid-cols-2 text-sm text-gray-600">
  <div class="mb-2">
    Except where otherwise noted, everything by <a href="/">cuibonobo</a> on this website is
    <a
      title="Creative Commons CC0"
      href="http://creativecommons.org/publicdomain/zero/1.0/"
      target="_blank"
      rel="noopener noreferrer">dedicated to the public domain</a
    >.
  </div>
  <div class="grid grid-rows-2 md:text-right">
    <nav class="mb-2 md:mb-0">
      <a class="md:ml-2" href="/ephemera/">Ephemera</a>
      <a class="md:ml-2" href="/articles/">Articles</a>
      <a class="md:ml-2" href="/about/">About</a>
    </nav>
    <div>
      <a
        class="md:ml-2"
        href="https://twitter.com/cuibonobo"
        target="_blank"
        rel="noopener noreferrer">Twitter</a
      >
      <a
        class="md:ml-2"
        href="https://github.com/cuibonobo"
        target="_blank"
        rel="noopener noreferrer">GitHub</a
      >
      <a
        class="md:ml-2"
        href="https://instagram.com/cuibonobo"
        target="_blank"
        rel="noopener noreferrer">Instagram</a
      >
    </div>
  </div>
</footer>
