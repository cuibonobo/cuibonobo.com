<script lang="ts">
  import marked from 'marked';
  import xss from 'xss';
  import xssDefaults from 'xss/lib/default';
  import prism from 'prismjs';
  import 'prismjs/components/prism-javascript';
  import 'prismjs/components/prism-typescript';
  import 'prismjs/components/prism-python';
  import 'prismjs/components/prism-powershell';
  import 'prismjs/components/prism-bash';
  import 'prismjs/components/prism-batch';

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

  const whiteList = { ...xssDefaults.whiteList, span: ['class'] };
  const content = xss(marked.parse(markdown), { whiteList });
</script>

{@html content}
