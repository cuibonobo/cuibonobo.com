import { Validator, Schema } from '@cfworker/json-schema';
import { Type, TypeSchema, TypeArraySchema, TypeDbCreate, TypeDbUpdate } from '../../codec/type';
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

const get = async (path: string): Promise<string> => {
  const response = await fetch(path, { headers: getAuthHeaders() });
  await throwOnResponseError(response);
  return response.text();
};

const getJson = async <T>(path: string): Promise<T> => {
  const text = await get(path);
  return <T>(<unknown>JSON.parse(text));
};

const update = async (path: string, data: string): Promise<string> => {
  const response = await fetch(path, {
    method: 'POST',
    body: data,
    headers: getAuthHeaders()
  });
  await throwOnResponseError(response);
  return response.text();
};

const updateJson = async <T>(path: string, data: JSONObject): Promise<T> => {
  const text = await update(path, JSON.stringify(data));
  return <T>(<unknown>JSON.parse(text));
};

const remove = async (path: string): Promise<string> => {
  const response = await fetch(path, { method: 'DELETE', headers: getAuthHeaders() });
  await throwOnResponseError(response);
  return response.text();
};

const removeJson = async <T>(path: string): Promise<T> => {
  const text = await remove(path);
  return <T>(<unknown>JSON.parse(text));
};

export const getAllResources = async <T extends ResourceTypeName>(): Promise<ResourceType<T>[]> => {
  const jsonresources = await getJson<JSONObject[]>(getUrl('resources'));
  const resources = jsonresources.map(jsonToResourceType);
  return resources;
};

export const getResource = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  return jsonToResourceType(await getJson(getUrl(`resources/${resourceId}`)));
};

export const getResourceBySlug = async <T extends ResourceTypeName>(
  slug: string,
  resourceType: T
): Promise<ResourceType<T>> => {
  if (resourceType === ResourceTypeName.Note) {
    throw new errors.ResourceTypeError('Notes do not have slugs!');
  }
  try {
    const jsonresources = await getJson<JSONValue>(
      getUrl(`resources?type=${resourceType}&contentKey=slug&contentValue=${slug}`)
    );
    return jsonToResourceType(jsonresources![0] as JSONObject);
  } catch (e: unknown) {
    throw new errors.ResourceNotFoundError(`No ${resourceType} resources contain slug '${slug}!'`);
  }
};

export const getResourcesByType = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<ResourceType<T>[]> => {
  const jsonresource = await getJson<JSONObject[]>(getUrl(`resources?type=${resourceType}`));
  const resources = jsonresource.map(jsonToResourceType);
  return resources;
};

export const createResource = async (data: JSONObject): Promise<boolean> => {
  return await updateJson(getUrl(`resources`), data);
};

export const updateResource = async (resourceId: string, data: JSONObject): Promise<boolean> => {
  return await updateJson(getUrl(`resources/${resourceId}`), data);
};

export const deleteResource = async (resourceId: string): Promise<boolean> => {
  return await removeJson(getUrl(`resources/${resourceId}`));
};

export const getAllTypes = async (): Promise<Type[]> => {
  const text = await get(getUrl('types'));
  const validator = new Validator(TypeArraySchema as unknown as Schema);
  if (!validator.validate(text)) {
    throw new Error('Could not parse server response!');
  }
  const types: Type[] = JSON.parse(text);
  return types;
};

export const getType = async (typeName: string): Promise<Type> => {
  const text = await get(getUrl(`types/${typeName}`));
  const validator = new Validator(TypeSchema as unknown as Schema);
  if (!validator.validate(text)) {
    throw new Error('Could not parse server response!');
  }
  const type: Type = JSON.parse(text);
  return type;
};

export const createType = async (data: TypeDbCreate): Promise<boolean> => {
  const text = await update(getUrl('types'), JSON.stringify(data));
  return JSON.parse(text);
};

export const updateType = async (typeName: string, data: TypeDbUpdate): Promise<boolean> => {
  const text = await update(getUrl(`types/${typeName}`), JSON.stringify(data));
  return JSON.parse(text);
};

export const deleteType = async (typeName: string): Promise<boolean> => {
  return await removeJson(getUrl(`types/${typeName}`));
};
