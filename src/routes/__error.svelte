<script context="module" lang="ts">
  // Error pages are different from [normal loading](https://kit.svelte.dev/docs#loading) in that
  // they are receiving a load output because loading from other pages failed.
  import type { LoadOutput, ErrorLoadInput } from '@sveltejs/kit';

  export const load: (loadOutput: ErrorLoadInput) => LoadOutput = ({ error, status }) => {
    if (error === undefined) {
      error = new Error('Error');
    }
    if (status === undefined) {
      status = 500;
    }
    return {
      props: {
        status,
        message: error.message
      }
    };
  };
</script>

<script>
  import MetaTitle from '../components/MetaTitle.svelte';
  export let status: string;
  export let message: string;
</script>

<MetaTitle title="Error: {status} | cuibonobo" />

<main class="prose">
  <h1>Error: {status}</h1>
  <p>{message}</p>
</main>
