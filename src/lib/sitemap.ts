import path from 'path';
import moment from 'moment';
import xml from 'xml-js';
import { writeFile, ensureDir } from './fs';
import { getAllIndexedPosts, getPostUrl } from './posts';
import { PostType, PostTypeName } from './types';

export const writeSitemap = async (origin: string): Promise<void> => {
  const sitemap = await getSitemap(origin);
  await ensureDir(path.dirname(getSitemapPath()));
  await writeFile(getSitemapPath(), sitemap);
};

const getSitemap = async (origin: string): Promise<string> => {
  const posts = await getAllIndexedPosts();
  return xml.js2xml(
    {
      declaration: {
        attributes: {
          version: '1.0',
          encoding: 'UTF-8'
        }
      },
      elements: [
        {
          type: 'element',
          name: 'urlset',
          attributes: {
            xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
          },
          elements: posts.map((p) => getUrlElement(origin, p))
        }
      ]
    },
    { spaces: 2 }
  );
};

const getUrlElement = <T extends PostTypeName>(origin: string, post: PostType<T>): xml.Element => {
  return {
    type: 'element',
    name: 'url',
    elements: [
      {
        type: 'element',
        name: 'loc',
        elements: [
          {
            type: 'text',
            text: getPostUrl(origin, post)
          }
        ]
      },
      {
        type: 'element',
        name: 'lastmod',
        elements: [
          {
            type: 'text',
            text: moment(post.updated).format('YYYY-MM-DD')
          }
        ]
      }
    ]
  };
};

const getSitemapPath = (): string => {
  return path.join(path.resolve('build'), 'sitemap.xml');
};
