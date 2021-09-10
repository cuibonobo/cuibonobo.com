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

<script lang="ts">
  import Title from '../components/Title.svelte';
  export let status: string;
  export let message: string;
</script>

<Title title="Error: {status}" />
<p>{message}</p>
