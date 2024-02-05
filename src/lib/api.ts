import { PostTypeName, PostType, QueryData, SlugData, jsonToPostType } from './types';
import * as errors from './errors';

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
  const response = await fetch(path);
  await throwOnResponseError(response);
  return <T>(<unknown>response.json());
};

export const getAllPosts = async <T extends PostTypeName>(): Promise<PostType<T>[]> => {
  const posts = await get<any[]>(getUrl('resources'));
  posts.forEach(jsonToPostType);
  return posts;
};

export const getPost = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  return jsonToPostType(await get(getUrl(`resources/${postId}`)));
};

export const getPostBySlug = async <T extends PostTypeName>(
  slug: string,
  postType: T
): Promise<PostType<T>> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  try {
    return await get(getUrl(`types/${postType}/slug/${slug}`))[0];
  } catch(e: unknown) {
    throw new errors.PostNotFoundError(`No ${postType} posts contain slug '${slug}!'`);
  }
};

export const getPostsByType = async <T extends PostTypeName>(
  postType: T
): Promise<PostType<T>[]> => {
  const queryData = await get<QueryData<T>>(getUrl(`types/${postType}`));
  queryData.forEach(jsonToPostType);
  return queryData;
};
