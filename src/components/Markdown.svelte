<script lang="ts">
  import { markdownToHtml } from '@lib/parser';

  export let markdown: string;

  const content = markdownToHtml(markdown);
</script>

{@html content}
