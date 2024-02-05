import path from 'path';
import matter from 'gray-matter';
import yaml from 'yaml';
import { generateId } from './id';
import { slugger } from './slugger';
import { PostTypeName, PostType, SlugData, IndexData, jsonToPostType } from './types';
import { writeJsonFile, readJsonFile, readDir, ensureDir, rm } from './fs';
import * as errors from './errors';

const yamlDivider = '---';
const yamlPlaceholder = '.';

export const getPostsDir = (): string => {
  return path.join(path.resolve('static'), 'posts');
};

const getIndexDir = (): string => {
  return path.join(path.resolve('static'), 'index');
};

export const readPost = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  const postPath = getPostPath(postId);
  return readPostFromPath(postPath);
};

const readPostFromPath = async <T extends PostTypeName>(postPath: string): Promise<PostType<T>> => {
  return jsonToPostType(await readJsonFile(postPath));
};

export const writePost = async <T extends PostTypeName>(post: PostType<T>): Promise<void> => {
  const postPath = getPostPath(post.id);
  await writeJsonFile(postPath, post);
};

export const deletePost = async (postId: string): Promise<void> => {
  const postPath = getPostPath(postId);
  await rm(postPath);
};

export const getFrontMatter = <T extends PostTypeName>(post: PostType<T>): string => {
  const yamlData = { ...post.content };
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

export const getAllPosts = async <T extends PostTypeName>(): Promise<PostType<T>[]> => {
  const dataDir = getPostsDir();
  const fileList = await readDir(dataDir, { withFileTypes: true });
  const items = await Promise.all(
    fileList.map(async (filePath) => {
      if (filePath.isDirectory()) {
        return;
      }
      return await readPostFromPath(path.join(dataDir, filePath.name));
    })
  );
  // Posts are sorted in reverse chronological order so newest are at the top
  return <PostType<T>[]>items.sort((a, b) => b.created.getTime() - a.created.getTime());
};

const getPostsByType = async <T extends PostTypeName>(postType: T): Promise<PostType<T>[]> => {
  const allPosts = await getAllPosts();
  const items: PostType<T>[] = [];
  for (const post of allPosts) {
    if (post.type == postType) {
      // `allPosts` are in reverse chronological order
      items.push(<PostType<T>>post);
    }
  }
  return items;
};

export const getPostById = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  return readPost(postId);
};

export const getPostBySlug = async <T extends PostTypeName>(
  slug: string,
  postType: T
): Promise<PostType<T>> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  const slugData = await readSlugFile(postType);
  if (slug in slugData) {
    return readPost(slugData[slug]);
  }
  throw new errors.PostNotFoundError(`No ${postType} posts contain slug '${slug}!'`);
};

const getPostPath = (postId: string): string => {
  return path.join(getPostsDir(), `${postId}.json`);
};

const convertTitleToSlug = (title: unknown): string => {
  if (typeof title === 'string') {
    return slugger(title);
  }
  return '';
};

export const appendDataToPost = <T extends PostTypeName>(
  post: PostType<T>,
  str: string
): PostType<T> => {
  const fileData = matter(str);
  post.content.text = fileData.content.trim();
  if (post.type !== PostTypeName.Ephemera) {
    const slug = fileData.data.slug
      ? <string>fileData.data.slug
      : convertTitleToSlug(fileData.data.title);
    post.content.slug = slug;
    post.content.title = fileData.data.title ? <string>fileData.data.title : '';
  }
  if (post.type === PostTypeName.Article) {
    post.content.tags = fileData.data.tags ? <string>fileData.data.tags : '';
  }
  return post;
};

export const getDefaultPostData = <T extends PostTypeName>(postType: T): PostType<T> => {
  const now = new Date();
  const postData = {
    id: generateId(now.getTime()),
    created: now,
    updated: now
  };
  switch (postType) {
    case PostTypeName.Page:
      return <PostType<T>>{
        type: PostTypeName.Page,
        ...postData,
        content: {
          title: yamlPlaceholder,
          slug: yamlPlaceholder,
          text: ''
        }
      };
    case PostTypeName.Article:
      return <PostType<T>>{
        type: PostTypeName.Article,
        ...postData,
        content: {
          title: yamlPlaceholder,
          tags: yamlPlaceholder,
          slug: yamlPlaceholder,
          text: ''
        }
      };
    case PostTypeName.Ephemera:
      return <PostType<T>>{ type: PostTypeName.Ephemera, ...postData, content: { text: '' } };
  }
};

const getPostTypeIndexDir = (postType: PostTypeName): string => {
  return path.join(getIndexDir(), postType);
};

const getPostTypeIndexPath = (postType: PostTypeName): string => {
  return path.join(getPostTypeIndexDir(postType), 'latest.json');
};

const getPostTypeSlugPath = (postType: PostTypeName): string => {
  return path.join(getPostTypeIndexDir(postType), 'slug.json');
};

const ensureIndexDir = async (postType: PostTypeName): Promise<void> => {
  await ensureDir(getPostTypeIndexDir(postType));
};

const readIndexFile = async <T extends PostTypeName>(postType: T): Promise<IndexData<T>> => {
  const indexData = await readJsonFile<IndexData<T>>(getPostTypeIndexPath(postType));
  indexData.posts.forEach(jsonToPostType);
  return indexData;
};

const writeIndexFile = async <T extends PostTypeName>(
  postType: T,
  indexData: IndexData<T>
): Promise<void> => {
  await writeJsonFile(getPostTypeIndexPath(postType), indexData);
};

const readSlugFile = async (postType: PostTypeName): Promise<SlugData> => {
  return await readJsonFile(getPostTypeSlugPath(postType));
};

const writeSlugFile = async (postType: PostTypeName, indexData: SlugData): Promise<void> => {
  await writeJsonFile(getPostTypeSlugPath(postType), indexData);
};

const shouldIndex = <T extends PostTypeName>(post: PostType<T>): boolean => {
  return post.type === PostTypeName.Ephemera || typeof post.content.slug !== 'number';
};

export const buildAllIndices = async (): Promise<void> => {
  for (const postType of Object.values(PostTypeName)) {
    await buildIndexByType(<PostTypeName>postType);
  }
};

const buildIndexByType = async <T extends PostTypeName>(postType: T): Promise<void> => {
  await ensureIndexDir(postType);
  const posts = await getPostsByType(postType);
  const indexData: IndexData<T> = { posts: [] };
  const slugData: SlugData = {};
  for (const post of posts) {
    if (shouldIndex(post)) {
      // `posts` are in reverse chronological order
      indexData.posts.push(post);
    }
    if (post.type !== PostTypeName.Ephemera) {
      slugData[post.content.slug] = post.id;
    }
  }
  await writeIndexFile(postType, indexData);
  if (Object.keys(slugData).length > 0) {
    await writeSlugFile(postType, slugData);
  }
};

export const getAllIndexedPosts = async <T extends PostTypeName>(): Promise<PostType<T>[]> => {
  let posts: PostType<T>[] = [];
  for (const postType of Object.values(PostTypeName)) {
    posts = posts.concat(<PostType<T>[]>await getIndexedPostsByType(postType));
  }
  return posts;
};

export const getIndexedPostsByType = async <T extends PostTypeName>(
  postType: T
): Promise<PostType<T>[]> => {
  const indexData = await readIndexFile(postType);
  return indexData.posts;
};

export const addToIndex = async <T extends PostTypeName>(post: PostType<T>): Promise<void> => {
  if (shouldIndex(post)) {
    const indexData = await readIndexFile(post.type);
    // Posts are in reverse chronological order in the index, so new posts are added to the top
    indexData.posts.unshift(post);
    await writeIndexFile(post.type, indexData);
  }
  if (post.type !== PostTypeName.Ephemera) {
    const slugData = await readSlugFile(post.type);
    slugData[post.content.slug] = post.id;
    await writeSlugFile(post.type, slugData);
  }
};

export const isExistingSlug = async (
  slug: string | number,
  postType: PostTypeName
): Promise<boolean> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  const slugData = await readSlugFile(postType);
  return slug in slugData;
};

export const getPostUrl = <T extends PostTypeName>(origin: string, post: PostType<T>): string => {
  let path = '';
  if (post.type === PostTypeName.Page) {
    path = post.content.slug === 'index' ? '/' : `/${post.content.slug}`;
  } else if (post.type === PostTypeName.Article) {
    path = `/articles/${post.content.slug}`;
  } else if (post.type === PostTypeName.Ephemera) {
    path = `/ephemera/${post.id}`;
  }
  return new URL(path, origin).href;
};
