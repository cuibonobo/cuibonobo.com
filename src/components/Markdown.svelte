<script lang="ts">
  import marked from 'marked';
  import * as xss from 'xss';
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

  const content = xss.filterXSS(marked.parse(markdown), {
    whiteList: { ...xss.whiteList, span: ['class'] }
  });
</script>

{@html content}
