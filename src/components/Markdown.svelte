<script lang="ts">
  import marked from 'marked';
  import xss from 'xss';

  export let markdown: string;

  const content = xss(marked(markdown));
</script>

{@html content}
