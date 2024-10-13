import moment from 'moment';
import mustache from 'mustache';
import path from 'path';
import { getResourcesByType } from './api';
import { ArticleType, NoteType, PageType, ResourceTypeName, ResourceType } from './types';
import { readFile, writeFile, ensureDir } from './fs';
import { markdownToHtml, escapeRegExp } from './parser';
import { getBaseMediaUrl } from './media';

export const writeSitePages = async (outputDir: string) => {
  const template = (await readFile('./src/layout.html')).toString();
  console.log('Building site HTML...');
  await ensureDir(outputDir);
  const pageResources = await getResourcesByType(ResourceTypeName.Page);
  const errorPage: PageType = {
    id: '',
    created: new Date(),
    updated: new Date(),
    type: ResourceTypeName.Page,
    attachments: [],
    content: {
      slug: '404',
      title: 'Page Not Found',
      text: "Looks like this URL doesn't exist!"
    }
  };
  pageResources.push(errorPage);
  console.log(`Found ${pageResources.length} pages...`);
  for (let i = 0; i < pageResources.length; i++) {
    const resource = pageResources[i];
    let resourcePath = path.join(outputDir, `${resource.content.slug}.html`);
    if (!['404', 'index'].includes(resource.content.slug.toString())) {
      const resourceDir = path.join(outputDir, resource.content.slug as string);
      await ensureDir(resourceDir);
      resourcePath = path.join(resourceDir, 'index.html');
    }
    const pageBody = await getPage(resource);
    const pageNav = getMainMenu(resource);
    const metaTitle = getPageMetaTitle(resource);
    await writeFile(resourcePath, mustache.render(template, { pageBody, pageNav, metaTitle }));
  }
  const articleDir = path.join(outputDir, 'articles');
  await ensureDir(articleDir);
  const articleResources = await getResourcesByType(ResourceTypeName.Article);
  console.log(`Found ${articleResources.length} pages...`);
  const articlesIdxPath = path.join(articleDir, 'index.html');
  const articlesIdxBody = getArticleCollection(articleResources);
  const articlesIdxNav = getMainMenu(articleResources[0]);
  await writeFile(
    articlesIdxPath,
    mustache.render(template, {
      pageBody: articlesIdxBody,
      pageNav: articlesIdxNav,
      metaTitle: getMetaTitle('Articles')
    })
  );
  for (let i = 0; i < articleResources.length; i++) {
    const resource = articleResources[i];
    const resourceDir = path.join(articleDir, resource.content.slug);
    await ensureDir(resourceDir);
    const resourcePath = path.join(resourceDir, 'index.html');
    const pageBody = await getArticle(resource);
    const pageNav = getMainMenu(resource);
    const metaTitle = getArticleMetaTitle(resource);
    await writeFile(resourcePath, mustache.render(template, { pageBody, pageNav, metaTitle }));
  }
  const ephemeraDir = path.join(outputDir, 'ephemera');
  await ensureDir(ephemeraDir);
  const ephemeraResources = await getResourcesByType(ResourceTypeName.Note);
  console.log(`Found ${ephemeraResources.length} pages...`);
  const ephemeraIdxPath = path.join(ephemeraDir, 'index.html');
  const ephemeraIdxBody = await getEphemeraCollection(ephemeraResources);
  const ephemeraIdxNav = getMainMenu(ephemeraResources[0]);
  await writeFile(
    ephemeraIdxPath,
    mustache.render(template, {
      pageBody: ephemeraIdxBody,
      pageNav: ephemeraIdxNav,
      metaTitle: getMetaTitle('Ephemera')
    })
  );
  for (let i = 0; i < ephemeraResources.length; i++) {
    const resource = ephemeraResources[i];
    const resourceDir = path.join(ephemeraDir, resource.id);
    await ensureDir(resourceDir);
    const resourcePath = path.join(resourceDir, 'index.html');
    const pageBody = await getEphemera(resource);
    const pageNav = getMainMenu(resource);
    const metaTitle = getEphemeraMetaTitle(resource);
    await writeFile(resourcePath, mustache.render(template, { pageBody, pageNav, metaTitle }));
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

const getTextWithAttachments = <T extends ResourceTypeName>(
  resource: ResourceType<T>
): Promise<string> => {
  let output = resource.content.text;
  resource.attachments.forEach((attachment) => {
    const mediaUrl = new URL(attachment.id, getBaseMediaUrl());
    mediaUrl.searchParams.append('filename', attachment.name);
    const mediaRegex = new RegExp(
      '(\\(|"|\')(' + escapeRegExp(attachment.name) + ')(\\)|"|\'|\\\\"\\\\\')',
      'g'
    );
    output = output.replace(mediaRegex, '$1' + mediaUrl.href + '$3');
  });
  return markdownToHtml(output);
};

const getBodyMetadata = (created?: Date, tags?: string): string => {
  return `<div class="article-metadata">
  ${created ? getDisplayDate(created) : ''}
  ${tags ? `<div>${tags}</div>` : ''}
</div>`;
};

const getBodyFooter = (created?: Date, updated?: Date): string => {
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
  created?: Date,
  updated?: Date,
  tags?: string,
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

const getPage = async (resource: PageType): Promise<string> => {
  return getBody(resource.content.title, await getTextWithAttachments(resource));
};

const getPageMetaTitle = (resource: PageType): string => {
  if (resource.content.slug == 'index') {
    return getMetaTitle('cuibonobo', true);
  }
  return getMetaTitle(resource.content.title);
};

const getArticle = async (resource: ArticleType): Promise<string> => {
  return getBody(
    resource.content.title,
    await getTextWithAttachments(resource),
    resource.created,
    resource.updated,
    resource.content.tags
  );
};

const getArticleCollection = (resources: ArticleType[]): string => {
  let listItems: string = '';
  for (let i = 0; i < resources.length; i++) {
    listItems += `<li><a href="/articles/${resources[i].content.slug}/">${resources[i].content.title}</a></li>\n`;
  }
  const body = `<ul>${listItems}</ul>`;
  return getBody('Articles', body);
};

const getArticleMetaTitle = (resource: ArticleType): string => {
  return getMetaTitle(resource.content.title);
};

const getEphemera = async (resource: NoteType): Promise<string> => {
  return getBody(
    `Ephemera ${resource.id}`,
    await getTextWithAttachments(resource),
    resource.created,
    resource.updated,
    undefined,
    false
  );
};

const getEphemeraCollectionItem = async (resource: NoteType): Promise<string> => {
  return `<div class="collection-item">
  ${await getTextWithAttachments(resource)}
  <div class="article-metadata">
    <a href="/ephemera/${resource.id}/">${getDisplayDate(
      resource.created,
      undefined,
      undefined,
      true
    )}</a>
  </div>
</div>`;
};

const getEphemeraCollection = async (resources: NoteType[]): Promise<string> => {
  let body: string = '';
  for (let i = 0; i < resources.length; i++) {
    body += await getEphemeraCollectionItem(resources[i]);
  }
  return getBody('Ephemera', body);
};

const getEphemeraMetaTitle = (resource: NoteType): string => {
  return getMetaTitle(`Ephemera ${resource.id}`);
};

export const getResourceUrl = <T extends ResourceTypeName>(
  origin: string,
  resource: ResourceType<T>
): string => {
  let path = '';
  if (resource.type === ResourceTypeName.Page) {
    path = resource.content.slug === 'index' ? '/' : `/${resource.content.slug}`;
  } else if (resource.type === ResourceTypeName.Article) {
    path = `/articles/${resource.content.slug}`;
  } else if (resource.type === ResourceTypeName.Note) {
    path = `/ephemera/${resource.id}`;
  }
  return new URL(path, origin).href;
};

const getMainMenu = <T extends ResourceTypeName>(resource: ResourceType<T>): string => {
  return `<nav id="main-menu" class="flex flex-wrap leading-loose">
  <a class="mr-2 md:mr-4${
    resource.type === ResourceTypeName.Page && resource.content.slug == 'index' ? ' active' : ''
  }" href="/">Home</a>
  <a class="mx-2 md:mx-4${
    resource.type === ResourceTypeName.Note ? ' active' : ''
  }" href="/ephemera/">Ephemera</a>
  <a class="mx-2 md:mx-4${
    resource.type === ResourceTypeName.Article ? ' active' : ''
  }" href="/articles/">Articles</a>
  <a class="ml-2 md:ml-4${
    resource.type === ResourceTypeName.Page && resource.content.slug == 'about' ? ' active' : ''
  }" href="/about/">About</a>
</nav>`;
};
