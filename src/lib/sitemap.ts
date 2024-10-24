import path from 'path';
import moment from 'moment';
import xml from 'xml-js';
import { writeFile, ensureDir } from './fs';
import { getResourceUrl } from './site';
import { getAllResources } from './api';
import { ResourceType, ResourceTypeName } from './types';

export const writeSitemap = async (origin: string): Promise<void> => {
  const sitemap = await getSitemap(origin);
  await ensureDir(path.dirname(getSitemapPath()));
  await writeFile(getSitemapPath(), sitemap);
};

const getSitemap = async (origin: string): Promise<string> => {
  const resources = await getAllResources();
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
          elements: resources.map((p) => getUrlElement(origin, p))
        }
      ]
    },
    { spaces: 2 }
  );
};

const getUrlElement = <T extends ResourceTypeName>(
  origin: string,
  resource: ResourceType<T>
): xml.Element => {
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
            text: getResourceUrl(origin, resource)
          }
        ]
      },
      {
        type: 'element',
        name: 'lastmod',
        elements: [
          {
            type: 'text',
            text: moment(resource.updated_date).format('YYYY-MM-DD')
          }
        ]
      }
    ]
  };
};

const getSitemapPath = (): string => {
  return path.join(path.resolve('static'), 'sitemap.xml');
};
