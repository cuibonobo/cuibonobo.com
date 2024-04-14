import matter from 'gray-matter';
import yaml from 'yaml';
import { generateId } from './id';
import { slugger } from './slugger';
import { ResourceTypeName, ResourceType } from './types';

const yamlDivider = '---';
const yamlPlaceholder = '.';

export const getFrontMatter = <T extends ResourceTypeName>(resource: ResourceType<T>): string => {
  const yamlData = { ...resource.content };
  delete yamlData.text;
  let yamlLines = [];
  if (Object.keys(yamlData).length > 0) {
    const dataLines = yaml.stringify(yamlData).split('\n');
    yamlLines = yamlLines.concat([
      yamlDivider,
      ...dataLines.slice(0, dataLines.length - 1),
      yamlDivider,
      ''
    ]);
  }
  return yamlLines.join('\n');
};

const convertTitleToSlug = (title: unknown): string => {
  if (typeof title === 'string') {
    return slugger(title);
  }
  return '';
};

export const appendDataToResource = <T extends ResourceTypeName>(
  resource: ResourceType<T>,
  str: string
): ResourceType<T> => {
  const fileData = matter(str);
  resource.content.text = fileData.content.trim();
  if (resource.type !== ResourceTypeName.Note) {
    const slug = fileData.data.slug
      ? <string>fileData.data.slug
      : convertTitleToSlug(fileData.data.title);
    resource.content.slug = slug;
    resource.content.title = fileData.data.title ? <string>fileData.data.title : '';
  }
  if (resource.type === ResourceTypeName.Article) {
    resource.content.tags = fileData.data.tags ? <string>fileData.data.tags : '';
  }
  return resource;
};

export const getDefaultResourceData = <T extends ResourceTypeName>(
  resourceType: T
): ResourceType<T> => {
  const now = new Date();
  const resourceData = {
    id: generateId(now.getTime()),
    created: now,
    updated: now
  };
  switch (resourceType) {
    case ResourceTypeName.Page:
      return <ResourceType<T>>{
        type: ResourceTypeName.Page,
        ...resourceData,
        content: {
          title: yamlPlaceholder,
          slug: yamlPlaceholder,
          text: ''
        }
      };
    case ResourceTypeName.Article:
      return <ResourceType<T>>{
        type: ResourceTypeName.Article,
        ...resourceData,
        content: {
          title: yamlPlaceholder,
          tags: yamlPlaceholder,
          slug: yamlPlaceholder,
          text: ''
        }
      };
    case ResourceTypeName.Note:
      return <ResourceType<T>>{
        type: ResourceTypeName.Note,
        ...resourceData,
        content: { text: '' }
      };
  }
};
