import { ResourceTypeName, ResourceType, jsonToResourceType, JSONObject, JSONValue } from './types';
import * as errors from './errors';
import { getAuthHeaders } from './auth';

const BASE_URL =
  process.env.NODE_ENV == 'production'
    ? 'https://cuibonobo.com/stack/'
    : 'http://127.0.0.1:8788/stack/';

const getUrl = (path: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : BASE_URL;
  return new URL(path, origin).href;
};

const isResponseError = (response: Response) => {
  return response.status < 200 || response.status >= 400;
};

const throwOnResponseError = async (response: Response) => {
  if (isResponseError(response)) {
    throw new Error(`Error at '${response.url}': ${await response.text()}`);
  }
};

const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { headers: getAuthHeaders() });
  await throwOnResponseError(response);
  return <T>(<unknown>response.json());
};

const update = async <T>(path: string, data: JSONObject): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: getAuthHeaders()
  });
  await throwOnResponseError(response);
  return <T>(<unknown>response.json());
};

const remove = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { method: 'DELETE', headers: getAuthHeaders() });
  await throwOnResponseError(response);
  return <T>(<unknown>response.json());
};

export const getAllResources = async <T extends ResourceTypeName>(): Promise<ResourceType<T>[]> => {
  const jsonresources = await get<JSONObject[]>(getUrl('resources'));
  const resources = jsonresources.map(jsonToResourceType);
  return resources;
};

export const getResource = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  return jsonToResourceType(await get(getUrl(`resources/${resourceId}`)));
};

export const getResourceBySlug = async <T extends ResourceTypeName>(
  slug: string,
  resourceType: T
): Promise<ResourceType<T>> => {
  if (resourceType === ResourceTypeName.Note) {
    throw new errors.ResourceTypeError('Notes do not have slugs!');
  }
  try {
    const jsonresources = await get<JSONValue>(getUrl(`types/${resourceType}/slug/${slug}`));
    return jsonToResourceType(jsonresources![0] as JSONObject);
  } catch (e: unknown) {
    throw new errors.ResourceNotFoundError(`No ${resourceType} resources contain slug '${slug}!'`);
  }
};

export const getResourcesByType = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<ResourceType<T>[]> => {
  const jsonresource = await get<JSONObject[]>(getUrl(`types/${resourceType}`));
  const resources = jsonresource.map(jsonToResourceType);
  return resources;
};

export const createResource = async (data: JSONObject): Promise<boolean> => {
  return await update(getUrl(`resources`), data);
};

export const updateResource = async (resourceId: string, data: JSONObject): Promise<boolean> => {
  return await update(getUrl(`resources/${resourceId}`), data);
};

export const deleteResource = async (resourceId: string): Promise<boolean> => {
  return await remove(getUrl(`resources/${resourceId}`));
};
