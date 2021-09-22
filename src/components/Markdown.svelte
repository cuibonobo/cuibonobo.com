<script lang="ts">
  import marked from 'marked';
  import xss from 'xss';
  import xssDefaults from 'xss/lib/default.js';
  import prism from 'prismjs';
  import 'prismjs/components/prism-javascript.js';
  import 'prismjs/components/prism-typescript.js';
  import 'prismjs/components/prism-python.js';
  import 'prismjs/components/prism-powershell.js';
  import 'prismjs/components/prism-bash.js';
  import 'prismjs/components/prism-batch.js';

  marked.setOptions({
    highlight: (code, lang) => {
      if (prism.languages[lang]) {
        return prism.highlight(code, prism.languages[lang], lang);
      } else {
        return code;
      }
    }
  });

  export let markdown: string;

  const content = xss(marked.parse(markdown), {
    whiteList: { ...xssDefaults.whiteList, span: ['class'], a: ['target', 'href', 'title', 'rel'] }
  });
</script>

{@html content}
