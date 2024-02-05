import moment from 'moment';
import mustache from 'mustache';
import path from 'path';
import { getPostsByType } from './api';
import { ArticleType, EphemeraType, PageType, PostTypeName } from './types';
import { readFile, writeFile, ensureDir } from './fs';
import { markdownToHtml } from './parser';

export const writeSitePages = async (outputDir: string) => {
  const template = (await readFile('./src/layout.html')).toString();
  console.log('Building site HTML...');
  await ensureDir(outputDir);
  const pagePosts = await getPostsByType(PostTypeName.Page);
  const errorPage: PageType = {
    id: '',
    created: new Date(),
    updated: new Date(),
    type: PostTypeName.Page,
    content: {
      slug: '404',
      title: 'Page Not Found',
      text: "Looks like this URL doesn't exist!"
    }
  };
  pagePosts.push(errorPage);
  console.log(`Found ${pagePosts.length} pages...`);
  for (let i = 0; i < pagePosts.length; i++) {
    const post = pagePosts[i];
    let postPath = path.join(outputDir, `${post.content.slug}.html`);
    if (!['404', 'index'].includes(post.content.slug.toString())) {
      const postDir = path.join(outputDir, post.content.slug as string);
      await ensureDir(postDir);
      postPath = path.join(postDir, 'index.html');
    }
    const pageBody = await getPage(post);
    const metaTitle = getPageMetaTitle(post);
    await writeFile(postPath, mustache.render(template, { pageBody, metaTitle }));
  }
  const articleDir = path.join(outputDir, 'articles');
  await ensureDir(articleDir);
  const articlePosts = await getPostsByType(PostTypeName.Article);
  console.log(`Found ${articlePosts.length} pages...`);
  const articlesIdxPath = path.join(articleDir, 'index.html');
  const articlesIdxBody = getArticleCollection(articlePosts);
  await writeFile(
    articlesIdxPath,
    mustache.render(template, { pageBody: articlesIdxBody, metaTitle: getMetaTitle('Articles') })
  );
  for (let i = 0; i < articlePosts.length; i++) {
    const post = articlePosts[i];
    const postDir = path.join(articleDir, post.content.slug);
    await ensureDir(postDir);
    const postPath = path.join(postDir, 'index.html');
    const pageBody = await getArticle(post);
    const metaTitle = getArticleMetaTitle(post);
    await writeFile(postPath, mustache.render(template, { pageBody, metaTitle }));
  }
  const ephemeraDir = path.join(outputDir, 'ephemera');
  await ensureDir(ephemeraDir);
  const ephemeraPosts = await getPostsByType(PostTypeName.Ephemera);
  console.log(`Found ${ephemeraPosts.length} pages...`);
  const ephemeraIdxPath = path.join(ephemeraDir, 'index.html');
  const ephemeraIdxBody = await getEphemeraCollection(ephemeraPosts);
  await writeFile(
    ephemeraIdxPath,
    mustache.render(template, { pageBody: ephemeraIdxBody, metaTitle: getMetaTitle('Ephemera') })
  );
  for (let i = 0; i < ephemeraPosts.length; i++) {
    const post = ephemeraPosts[i];
    const postDir = path.join(ephemeraDir, post.id);
    await ensureDir(postDir);
    const postPath = path.join(postDir, 'index.html');
    const pageBody = await getEphemera(post);
    const metaTitle = getEphemeraMetaTitle(post);
    await writeFile(postPath, mustache.render(template, { pageBody, metaTitle }));
  }
};

const getMetaTitle = (title: string, overrideDefault: boolean = false): string => {
  return overrideDefault ? title : `${title} | cuibonobo`;
};

const getTitle = (title: string, displayTitle: boolean = true): string => {
  if (displayTitle) {
    return `<h2>${title}</h2>`;
  }
  return '';
};

const getDisplayDate = (
  date: Date,
  prefix: string = 'Published on ',
  itemProp: string = 'datePublished',
  showTime: boolean = false
): string => {
  const friendlyString = moment(date).format(`MMMM Do YYYY${showTime ? ', h:mm:ss a' : ''}`);
  const datetimeString = moment(date).format();
  return `<time itemprop="${itemProp}" datetime="${datetimeString}" title="${datetimeString}">
  ${prefix}${friendlyString}
</time>`;
};

const getBodyMetadata = (created: Date = null, tags: string = null): string => {
  return `<div class="article-metadata">
  ${created ? getDisplayDate(created) : ''}
  ${tags ? `<div>${tags}</div>` : ''}
</div>`;
};

const getBodyFooter = (created: Date = null, updated: Date = null): string => {
  if (created && updated && updated > created) {
    return `<footer class="article-metadata mt-4">
  ${getDisplayDate(created, 'Updated on ', 'dateModified')}
</footer>`;
  }
  return '';
};

const getBody = (
  title: string,
  text: string,
  created: Date = null,
  updated: Date = null,
  tags: string = null,
  displayTitle: boolean = true
): string => {
  return `<article class="prose" aria-labelledby="accessible-semantic-html">
  <header>
    ${getBodyMetadata(created, tags)}
    ${getTitle(title, displayTitle)}
  </header>
  <section>
    ${text}
  </section>
  ${getBodyFooter(created, updated)}
</article>`;
};

const getPage = async (post: PageType): Promise<string> => {
  return getBody(post.content.title, await markdownToHtml(post.content.text));
};

const getPageMetaTitle = (post: PageType): string => {
  if (post.content.slug == 'index') {
    return getMetaTitle('cuibonobo', true);
  }
  return getMetaTitle(post.content.title);
};

const getArticle = async (post: ArticleType): Promise<string> => {
  return getBody(
    post.content.title,
    await markdownToHtml(post.content.text),
    post.created,
    post.updated,
    post.content.tags
  );
};

const getArticleCollection = (posts: ArticleType[]): string => {
  let listItems: string = '';
  for (let i = 0; i < posts.length; i++) {
    listItems += `<li><a href="/articles/${posts[i].content.slug}/">${posts[i].content.title}</a></li>\n`;
  }
  const body = `<ul>${listItems}</ul>`;
  return getBody('Articles', body);
};

const getArticleMetaTitle = (post: ArticleType): string => {
  return getMetaTitle(post.content.title);
};

const getEphemera = async (post: EphemeraType): Promise<string> => {
  return getBody(
    `Ephemera ${post.id}`,
    await markdownToHtml(post.content.text),
    post.created,
    post.updated,
    undefined,
    false
  );
};

const getEphemeraCollectionItem = async (post: EphemeraType): Promise<string> => {
  return `<div class="collection-item">
  ${await markdownToHtml(post.content.text)}
  <div class="article-metadata">
    <a href="/ephemera/${post.id}/">${getDisplayDate(post.created, undefined, undefined, true)}</a>
  </div>
</div>`;
};

const getEphemeraCollection = async (posts: EphemeraType[]): Promise<string> => {
  let body: string = '';
  for (let i = 0; i < posts.length; i++) {
    body += await getEphemeraCollectionItem(posts[i]);
  }
  return getBody('Ephemera', body);
};

const getEphemeraMetaTitle = (post: EphemeraType): string => {
  return getMetaTitle(`Ephemera ${post.id}`);
};
