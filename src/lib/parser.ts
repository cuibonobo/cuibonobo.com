// Despite the linter's objections, building RSS feeds doesn't if below is default import
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

const getMatchArray = (text: string, regex: RegExp): string[] => {
  const matches = text.match(regex);
  if (matches === null) {
    return [];
  }
  return matches;
};

const globalMarkdownLinkRegex =
  /!?\[([^\]]+)\]\(((?!https?)(?!:)(?!\/\/)[\w\d\s:/.?%=&*_\- [\]]+)("(.+)")?\)/g;

export const getRelativeMediaLinks = (text: string): string[] => {
  return getMatchArray(text, globalMarkdownLinkRegex)
    .map(getMarkdownLinkHref)
    .filter((link: string) => {
      return link && !link.startsWith('/') && !link.endsWith('/');
    });
};

export const getAbsoluteMediaLinks = (text: string): string[] => {
  return getMatchArray(text, globalMarkdownLinkRegex)
    .map(getMarkdownLinkHref)
    .filter((link: string) => {
      return link && link.startsWith('/') && !link.endsWith('/');
    });
};

const getMarkdownLinkHref = (markdownLink: string): string => {
  const singleMarkdownLinkRegex = /^(?:!?)\[.*\]\((.*)\)$/;
  return singleMarkdownLinkRegex.exec(markdownLink)[1];
};
