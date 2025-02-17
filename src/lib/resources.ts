import matter from 'gray-matter';
import yaml from 'yaml';
import { generateId } from './id';
import { slugger } from './slugger';
import { ResourceTypeName, ResourceType, ResourceBase } from './types';

const yamlDivider = '---';
const yamlPlaceholder = '.';

class ResourceError extends Error {}

export const getFrontMatter = <T extends ResourceTypeName>(resource: ResourceType<T>): string => {
  const yamlData: Record<string, unknown> = { ...resource.content };
  delete yamlData.text;
  let yamlLines: string[] = [];
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

const isBlankFrontmatter = (record: Record<string, string>, key: string): boolean => {
  return !record[key] || `${record[key]}` == '.';
};

const capitalize = (s: string): string => {
  if (s.length === 0) {
    return s;
  }
  return s[0].toUpperCase() + s.slice(1);
};

export const appendDataToResource = <T extends ResourceTypeName>(
  resource: ResourceType<T>,
  str: string
): ResourceType<T> => {
  const fileData = matter(str);
  resource.content.text = fileData.content.trim();
  if (resource.type !== ResourceTypeName.Note) {
    resource.content.title = !isBlankFrontmatter(fileData.data, 'title')
      ? <string>fileData.data.title
      : `${capitalize(resource.type)} ${resource.id}`;
    const slug = !isBlankFrontmatter(fileData.data, 'slug')
      ? <string>fileData.data.slug
      : slugger(resource.content.title);
    resource.content.slug = slug;
  }
  if (resource.type === ResourceTypeName.Article) {
    resource.content.tags = !isBlankFrontmatter(fileData.data, 'tags')
      ? <string>fileData.data.tags
      : '';
  }
  return resource;
};

export const getDefaultResourceData = <T extends ResourceTypeName>(
  resourceType: T
): ResourceType<T> => {
  const now = new Date();
  const resourceData: ResourceBase = {
    id: generateId(now.getTime()),
    is_public: true,
    created_date: now,
    updated_date: now,
    attachments: []
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
    default:
      throw new ResourceError(
        `Could not generate default data for resource type '${resourceType}'!`
      );
  }
};
