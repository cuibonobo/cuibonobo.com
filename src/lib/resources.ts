import path from 'path';
import matter from 'gray-matter';
import yaml from 'yaml';
import { generateId } from './id';
import { slugger } from './slugger';
import { ResourceTypeName, ResourceType, jsonToResourceType } from './types';
import { writeJsonFile, readJsonFile, readDir, rm } from './fs';

const yamlDivider = '---';
const yamlPlaceholder = '.';

export const getResourcesDir = (): string => {
  return path.join(path.resolve('static'), 'resources');
};

export const readResource = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  const resourcePath = getResourcePath(resourceId);
  return readResourcesFromPath(resourcePath);
};

const readResourcesFromPath = async <T extends ResourceTypeName>(
  resourcePath: string
): Promise<ResourceType<T>> => {
  return jsonToResourceType(await readJsonFile(resourcePath));
};

export const writeResource = async <T extends ResourceTypeName>(
  resource: ResourceType<T>
): Promise<void> => {
  const resourcePath = getResourcePath(resource.id);
  await writeJsonFile(resourcePath, resource);
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  const resourcePath = getResourcePath(resourceId);
  await rm(resourcePath);
};

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

export const getAllResources = async <T extends ResourceTypeName>(): Promise<ResourceType<T>[]> => {
  const dataDir = getResourcesDir();
  const fileList = await readDir(dataDir, { withFileTypes: true });
  const items = await Promise.all(
    fileList.map(async (filePath) => {
      if (filePath.isDirectory()) {
        return;
      }
      return await readResourcesFromPath(path.join(dataDir, filePath.name));
    })
  );
  // Resources are sorted in reverse chronological order so newest are at the top
  return <ResourceType<T>[]>items.sort((a, b) => b.created.getTime() - a.created.getTime());
};

export const getResourceById = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  return readResource(resourceId);
};

const getResourcePath = (resourceId: string): string => {
  return path.join(getResourcesDir(), `${resourceId}.json`);
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
  if (resource.type !== ResourceTypeName.Ephemera) {
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
    case ResourceTypeName.Ephemera:
      return <ResourceType<T>>{
        type: ResourceTypeName.Ephemera,
        ...resourceData,
        content: { text: '' }
      };
  }
};
