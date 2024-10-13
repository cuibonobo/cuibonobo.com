// Despite the linter's objections, building RSS feeds doesn't work if below is default import
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import xss, { IFilterXSSOptions } from 'xss';
import xssDefaults from 'xss/lib/default.js';
import prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-powershell.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-batch.js';

const marked = new Marked(
  markedHighlight({
    highlight(code, lang) {
      if (prism.languages[lang]) {
        return prism.highlight(code, prism.languages[lang], lang);
      } else {
        return code;
      }
    }
  })
);

const xssOptions: IFilterXSSOptions = {
  whiteList: { ...xssDefaults.whiteList, span: ['class'], a: ['target', 'href', 'title', 'rel'] }
};

export const markdownToHtml = async (markdown: string): Promise<string> => {
  return xss(await marked.parse(markdown), xssOptions);
};

const processUrlGroupMatches = (text: string, regex: RegExp): string[] => {
  const matches = [...text.matchAll(regex)];
  return matches
    .filter((match) => match.groups && match.groups.url)
    .map((match) => match.groups!.url);
};

const getMarkdownLinks = (text: string): string[] => {
  const markdownLinkRegex =
    /!?\[(?<alt>[^\]]+)\]\((?<url>(?!https?)(?!:)(?!\/\/)[\w\d\s:/.?%=&*_\- [\]]+)("(.+)")?\)/g;
  return processUrlGroupMatches(text, markdownLinkRegex);
};

const getSrcLinks = (text: string): string[] => {
  const srcRegex = /.src=(?:"|')(?<url>.*)(?:"|')/g;
  return processUrlGroupMatches(text, srcRegex);
};

export const getAbsoluteMediaLinks = (text: string): string[] => {
  const markdownLinks = getMarkdownLinks(text);
  return markdownLinks.concat(getSrcLinks(text)).filter((link: string) => {
    return link && link.startsWith('/') && !link.endsWith('/');
  });
};

// https://stackoverflow.com/a/3561711
export const escapeRegExp = (text: string): string => {
  return text.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};
