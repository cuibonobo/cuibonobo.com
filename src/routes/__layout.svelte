<script>
  import '../tailwind.css';
  import MetaTitle from '../components/MetaTitle.svelte';
</script>

<MetaTitle title="cuibonobo" />

<header class="items-center container justify-between flex bg-white p-4 my-4 mx-auto">
  <div class="text-2xl font-bold inline-flex items-center">cuibonobo</div>
  <nav class="flex">
    <a class="ml-5 px-2 py-1" href="/">Home</a>
    <a class="ml-5 px-2 py-1" href="/ephemera/">Ephemera</a>
    <a class="ml-5 px-2 py-1" href="/articles/">Articles</a>
    <a class="ml-5 px-2 py-1" href="/about/">About</a>
  </nav>
</header>

<div class="bg-white container mx-auto p-4">
  <slot />
</div>

<footer class="container mx-auto p-4 text-center text-sm text-gray-600">
  Except where otherwise noted, everything by cuibonobo on this website is <a
    class="underline"
    title="Creative Commons CC0"
    href="http://creativecommons.org/publicdomain/zero/1.0/"
    target="_blank"
    rel="noopener noreferrer">dedicated to the public domain</a
  >.
</footer>
