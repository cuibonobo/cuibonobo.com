import path from 'path';
import { Author, Feed, Item } from 'feed';
import { getPostUrl } from './posts';
import { getAllPosts, getPostsByType } from './api';
import { PostType, PostTypeName } from './types';
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
  const allPostsFeed = await getAllPostsFeed(originUrl, itemLimit);
  const ephemeraFeed = await getPostTypeFeed(PostTypeName.Ephemera, originUrl, itemLimit);
  const articleFeed = await getPostTypeFeed(PostTypeName.Article, originUrl, itemLimit);
  await ensureDir(path.resolve('static'));
  await writeFeed(allPostsFeed);
  await writeFeed(ephemeraFeed);
  await writeFeed(articleFeed);
};

const writeFeed = async (feed: Feed): Promise<void> => {
  await writeFile(getFeedPath(feed, FeedType.Atom), feed.atom1());
  await writeFile(getFeedPath(feed, FeedType.Json), feed.json1());
};

const getAllPostsFeed = async (originUrl: string, itemLimit: number): Promise<Feed> => {
  const { origin, author, feed } = getBaseFeedParts(originUrl);
  feed.options.description = "cuibonobo's personal website feed: all posts";
  feed.options.feedLinks = {
    json: origin.path('/feed.json'),
    atom: origin.path('/feed.xml')
  };
  const posts = (await getAllPosts())
    .filter((post) => post.type !== PostTypeName.Page)
    .sort((a, b) => b.created.valueOf() - a.created.valueOf());
  posts.splice(itemLimit, posts.length - itemLimit);
  for (let i = 0; i < posts.length; i++) {
    const feedItem = await getFeedItem(posts[i], originUrl, author);
    feed.addItem(feedItem);
  }
  return feed;
};

const getPostTypeFeed = async (
  postType: PostTypeName,
  originUrl: string,
  itemLimit: number
): Promise<Feed> => {
  const { origin, author, feed } = getBaseFeedParts(originUrl);
  const postTypeName = postType.toString();
  feed.options.description = `cuibonobo's personal website feed: ${postTypeName}`;
  feed.options.feedLinks = {
    json: origin.path(`/${postTypeName}-feed.json`),
    atom: origin.path(`/${postTypeName}-feed.xml`)
  };
  const posts = (await getPostsByType(postType)).sort(
    (a, b) => b.created.valueOf() - a.created.valueOf()
  );
  posts.splice(itemLimit, posts.length - itemLimit);
  for (let i = 0; i < posts.length; i++) {
    feed.addItem(await getFeedItem(posts[i], originUrl, author));
  }
  return feed;
};

const getFeedItem = async <T extends PostTypeName>(
  post: PostType<T>,
  originUrl: string,
  author: Author
): Promise<Item> => {
  return {
    title: post.type === PostTypeName.Ephemera ? `Ephemera: ${post.id}` : post.content.title,
    id: post.id,
    link: getPostUrl(originUrl, post),
    content: await markdownToHtml(post.content.text),
    author: [author],
    date: post.created,
    category: [{ name: post.type }]
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
