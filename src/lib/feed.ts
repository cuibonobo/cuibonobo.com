import path from 'path';
import { Author, Feed, Item } from 'feed';
import { getResourceUrl } from './site';
import { getAllResources, getResourcesByType } from './api';
import { ResourceType, ResourceTypeName } from './types';
import { writeFile, ensureDir } from './fs';
import { markdownToHtml } from './parser';

enum FeedType {
  Atom,
  Json
}

interface OriginType {
  path: (p: string) => string;
  base: () => string;
}

interface FeedLink {
  json: string;
  atom: string;
}

export const writeFeeds = async (originUrl: string, itemLimit = 10): Promise<void> => {
  const allResourcesFeed = await getAllResourcesFeed(originUrl, itemLimit);
  const ephemeraFeed = await getResourceTypeFeed(
    'ephemera',
    ResourceTypeName.Note,
    originUrl,
    itemLimit
  );
  const articleFeed = await getResourceTypeFeed(
    'article',
    ResourceTypeName.Article,
    originUrl,
    itemLimit
  );
  await ensureDir(path.resolve('static'));
  await writeFeed(allResourcesFeed);
  await writeFeed(ephemeraFeed);
  await writeFeed(articleFeed);
};

const writeFeed = async (feed: Feed): Promise<void> => {
  await writeFile(getFeedPath(feed, FeedType.Atom), feed.atom1());
  await writeFile(getFeedPath(feed, FeedType.Json), feed.json1());
};

const getAllResourcesFeed = async (originUrl: string, itemLimit: number): Promise<Feed> => {
  const { origin, author, feed } = getBaseFeedParts(originUrl);
  feed.options.description = "cuibonobo's personal website feed: all resources";
  feed.options.feedLinks = {
    json: origin.path('/feed.json'),
    atom: origin.path('/feed.xml')
  };
  const resources = (await getAllResources())
    .filter((resource) => resource.type !== ResourceTypeName.Page)
    .sort((a, b) => b.created_date.valueOf() - a.created_date.valueOf());
  resources.splice(itemLimit, resources.length - itemLimit);
  for (let i = 0; i < resources.length; i++) {
    const feedItem = await getFeedItem(resources[i], originUrl, author);
    feed.addItem(feedItem);
  }
  return feed;
};

const getResourceTypeFeed = async (
  feedName: string,
  resourceType: ResourceTypeName,
  originUrl: string,
  itemLimit: number
): Promise<Feed> => {
  const { origin, author, feed } = getBaseFeedParts(originUrl);
  feed.options.description = `cuibonobo's personal website feed: ${feedName}`;
  feed.options.feedLinks = {
    json: origin.path(`/${feedName}-feed.json`),
    atom: origin.path(`/${feedName}-feed.xml`)
  };
  const resources = (await getResourcesByType(resourceType)).sort(
    (a, b) => b.created_date.valueOf() - a.created_date.valueOf()
  );
  resources.splice(itemLimit, resources.length - itemLimit);
  for (let i = 0; i < resources.length; i++) {
    feed.addItem(await getFeedItem(resources[i], originUrl, author));
  }
  return feed;
};

const getFeedItem = async <T extends ResourceTypeName>(
  resource: ResourceType<T>,
  originUrl: string,
  author: Author
): Promise<Item> => {
  return {
    title:
      resource.type === ResourceTypeName.Note ? `Ephemera: ${resource.id}` : resource.content.title,
    id: resource.id,
    link: getResourceUrl(originUrl, resource),
    content: await markdownToHtml(resource.content.text),
    author: [author],
    date: resource.created_date,
    category: [{ name: resource.type }]
  };
};

const getBaseFeedParts = (originUrl: string) => {
  const origin = Origin(originUrl);
  const author = getAuthor(origin);
  const feed = getBaseFeed(origin, author);
  return { origin, author, feed };
};

const getAuthor = (origin: OriginType): Author => {
  return {
    name: 'Jen Garcia',
    link: origin.base()
  };
};

const getBaseFeed = (origin: OriginType, author: Author): Feed => {
  return new Feed({
    title: 'cuibonobo',
    id: origin.base(),
    link: origin.base(),
    language: 'en', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    favicon: origin.path('/favicon.ico'),
    copyright: 'CC0',
    updated: new Date(),
    generator: 'https://github.com/cuibonobo/cuibonobo.com',
    author
  });
};

const getFeedPath = (feed: Feed, type: FeedType): string => {
  if (!feed.options.feedLinks) {
    throw new Error('Feed does not have feed links defined!');
  }
  const feedLink = feed.options.feedLinks as FeedLink;
  const feedUrl: string = type === FeedType.Json ? feedLink.json : feedLink.atom;
  const feedFileName = path.basename(feedUrl);
  return path.join(path.resolve('static'), feedFileName);
};

const Origin = (originUrl: string): OriginType => {
  const origin = new URL('/', originUrl);
  return {
    path: (p: string): string => {
      origin.pathname = p;
      return origin.href;
    },
    base: (): string => {
      origin.pathname = '/';
      return origin.href;
    }
  };
};
