import { PostTypeName, PostType, IndexData, SlugData } from './types';
import * as errors from './errors';

const BASE_URL =
  process.env.NODE_ENV == 'production'
    ? 'https://raw.githubusercontent.com/cuibonobo/cuibonobo.com/main/static/'
    : 'http://localhost:8000';

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

const getIndexUrl = (postType: PostTypeName): string => {
  return getUrl(`index/${postType}/latest.json`);
};

const getSlugUrl = (postType: PostTypeName): string => {
  return getUrl(`index/${postType}/slug.json`);
};

const getPostUrl = (postId: string): string => {
  return getUrl(`posts/${postId}.json`);
};

const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  await throwOnResponseError(response);
  return <T>(<unknown>response.json());
};

const getIndexData = async <T extends PostTypeName>(postType: T): Promise<IndexData<T>> => {
  return get(getIndexUrl(postType));
};

const getSlugData = async (postType: PostTypeName): Promise<SlugData> => {
  return get(getSlugUrl(postType));
};

export const getPost = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  return get(getPostUrl(postId));
};

export const getPostBySlug = async <T extends PostTypeName>(
  slug: string,
  postType: T
): Promise<PostType<T>> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  const slugData = await getSlugData(postType);
  if (slug in slugData) {
    return getPost(slugData[slug]);
  }
  throw new errors.PostNotFoundError(`No ${postType} posts contain slug '${slug}!'`);
};

export const getPostsByType = async <T extends PostTypeName>(
  postType: T
): Promise<PostType<T>[]> => {
  const indexData = await getIndexData(postType);
  return Object.values(indexData);
};
