import * as marked from 'marked';
import type { MarkedOptions } from 'marked';
import xss, { IFilterXSSOptions } from 'xss';
import xssDefaults from 'xss/lib/default.js';
import prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-powershell.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-batch.js';

const markedOptions: MarkedOptions = {
  highlight: (code, lang) => {
    if (prism.languages[lang]) {
      return prism.highlight(code, prism.languages[lang], lang);
    } else {
      return code;
    }
  }
};
const xssOptions: IFilterXSSOptions = {
  whiteList: { ...xssDefaults.whiteList, span: ['class'], a: ['target', 'href', 'title', 'rel'] }
};

marked.setOptions(markedOptions);

export const markdownToHtml = (markdown: string): string => {
  return xss(marked.parse(markdown), xssOptions);
};
