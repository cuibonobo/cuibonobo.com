import path from 'path';
import { Feed } from 'feed';
import { getAllIndexedPosts, getPostUrl } from './posts';
import { PostTypeName } from './types';
import { writeFile, ensureDir } from './fs';
import { markdownToHtml } from './parser';

enum FeedType {
  Atom,
  Json
}

export const writeFeeds = async (originUrl: string, itemLimit = 10): Promise<void> => {
  const feed = await getFeed(originUrl, itemLimit);
  await ensureDir(path.dirname(getFeedPath(FeedType.Atom)));
  await writeFile(getFeedPath(FeedType.Atom), feed.atom1());
  await writeFile(getFeedPath(FeedType.Json), feed.json1());
};

const getFeed = async (originUrl: string, itemLimit: number): Promise<Feed> => {
  const origin = Origin(originUrl);
  const author = {
    name: 'Jen Garcia',
    link: origin.base()
  };
  const feed = new Feed({
    title: 'cuibonobo',
    description: "cuibonobo's personal website feed.",
    id: origin.base(),
    link: origin.base(),
    language: 'en', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    favicon: origin.path('/favicon.ico'),
    copyright: 'CC0',
    updated: new Date(),
    generator: 'https://github.com/cuibonobo/cuibonobo.com',
    feedLinks: {
      json: origin.path('/feed.json'),
      atom: origin.path('/feed.xml')
    },
    author
  });
  const posts = (await getAllIndexedPosts())
    .filter((post) => post.type !== PostTypeName.Page)
    .sort((a, b) => b.created.valueOf() - a.created.valueOf());
  posts.splice(itemLimit, posts.length - itemLimit);
  posts.forEach((post) => {
    feed.addItem({
      title: post.type === PostTypeName.Ephemera ? post.id : post.content.title,
      id: post.id,
      link: getPostUrl(originUrl, post),
      content: markdownToHtml(post.content.text),
      author: [author],
      date: post.created,
      category: [{ name: post.type }]
    });
  });
  return feed;
};

const getFeedPath = (type: FeedType): string => {
  const feedFileName = type === FeedType.Json ? 'feed.json' : 'feed.xml';
  return path.join(path.resolve('static'), feedFileName);
};

const Origin = (originUrl: string) => {
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
