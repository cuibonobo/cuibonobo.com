import path from 'path';
import yaml from 'yaml';
import matter from 'gray-matter';
import { generateId } from './id';
import { slugger } from './slugger';
import { PostTypeName, PostType, SlugData, IndexData, PageType } from './types';
import {
  writeJsonFile,
  readJsonFile,
  mkTempDir,
  writeFile,
  readFile,
  readDir,
  rm,
  rmDir,
  fileExists,
  ensureDir
} from './fs';
import * as errors from './errors';

const yamlDivider = '---';
const yamlPlaceholder = '.';
const lockFileName = '.lock';

interface LockData {
  lockedFilePath: string;
  postType: string;
  postId: string;
}

export const getDataDir = (): string => {
  return path.join(path.resolve('static'), 'posts');
};

const getIndexDir = (): string => {
  return path.join(path.resolve('static'), 'index');
};

export const createPost = async <T extends PostTypeName>(postType: T): Promise<PostType<T>> => {
  const postData = getDefaultPostData(postType);
  await writePost(postData);
  return postData;
};

export const editPost = async (postId: string): Promise<string> => {
  const post = await readPost(postId);
  return await checkoutPost(post);
};

const readPost = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  const postPath = getPostPath(postId);
  return readPostFromPath(postPath);
};

const readPostFromPath = async <T extends PostTypeName>(postPath: string): Promise<PostType<T>> => {
  const post: PostType<T> = await readJsonFile(postPath);
  post.created = new Date(post.created);
  post.updated = new Date(post.updated);
  return post;
};

const writePost = async <T extends PostTypeName>(post: PostType<T>): Promise<void> => {
  const postPath = getPostPath(post.id);
  await writeJsonFile(postPath, post);
};

export const checkoutPost = async <T extends PostTypeName>(post: PostType<T>): Promise<string> => {
  await throwOnLockFile();
  const editorDir = await mkTempDir();
  const yamlData = { ...post.content };
  const text = post.content.text;
  delete yamlData.text;
  let postOutput = [];
  if (Object.keys(yamlData).length > 0) {
    const yamlLines = yaml.stringify(yamlData).split('\n');
    postOutput = postOutput.concat([
      yamlDivider,
      ...yamlLines.slice(0, yamlLines.length - 1),
      yamlDivider,
      ''
    ]);
  }
  const editorFile = path.join(editorDir, `${post.id}.md`);
  await writeFile(editorFile, postOutput.join('\n') + text);
  await writeLockFile(post.id, post.type, editorFile);
  return editorFile;
};

const convertTitleToSlug = (title: unknown): string => {
  if (typeof title === 'string') {
    return slugger(title);
  }
  return '';
};

export const commitPost = async <T extends PostTypeName>(): Promise<void> => {
  const lockFile = await readLockFile();
  const post: PostType<T> = await readPost(lockFile.postId);
  const fileStr: string = await readFile(lockFile.lockedFilePath, 'utf-8');
  const fileData = matter(fileStr);
  if (post.content.text) {
    post.updated = new Date();
    if (post.content.text.startsWith('\n')) {
      post.content.text = post.content.text.slice(1);
    }
    if (post.content.text.endsWith('\n')) {
      post.content.text = post.content.text.slice(0, post.content.text.length - 1);
    }
  }
  post.content.text = fileData.content;
  if (post.type !== PostTypeName.Ephemera) {
    const slug = fileData.data.slug
      ? <string>fileData.data.slug
      : convertTitleToSlug(fileData.data.title);
    if (await isExistingSlug(slug, post.type)) {
      throw new errors.PostError(`The slug '${slug}' already exists!`);
    }
    post.content.slug = slug;
    post.content.title = fileData.data.title ? <string>fileData.data.title : '';
  }
  if (post.type === PostTypeName.Article) {
    post.content.tags = fileData.data.tags ? <string>fileData.data.tags : '';
  }
  await writePost(post);
  await deleteLockFile();
  await addToIndex(post);
};

const getAllPosts = async <T extends PostTypeName>(): Promise<PostType<T>[]> => {
  const dataDir = getDataDir();
  const fileList = await readDir(dataDir, { withFileTypes: true });
  const items = await Promise.all(
    fileList.map(async (filePath) => {
      if (filePath.isDirectory()) {
        return;
      }
      return await readPostFromPath(path.join(dataDir, filePath.name));
    })
  );
  return <PostType<T>[]>items.sort((a, b) => b.created.getTime() - a.created.getTime());
};

const getPostsByType = async <T extends PostTypeName>(postType: T): Promise<PostType<T>[]> => {
  const allPosts = await getAllPosts();
  const items: PostType<T>[] = [];
  for (const post of allPosts) {
    if (post.type == postType) {
      items.push(<PostType<T>>post);
    }
  }
  return items;
};

export const getPostById = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  return readPost(postId);
};

export const getPostBySlug = async <T extends PostTypeName>(slug: string, postType: T): Promise<PostType<T>> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  const slugData = await readSlugFile(postType);
  if (slug in slugData) {
    return readPost(slugData[slug]);
  }
  throw new errors.PostNotFoundError(`No ${postType} posts contain slug '${slug}!'`);
};

const writeLockFile = async (
  postId: string,
  postType: PostTypeName,
  lockedFilePath: string
): Promise<void> => {
  await writeFile(getLockFilePath(), `${lockedFilePath}\n${postType}\n${postId}`);
};

export const readLockFile = async (): Promise<LockData> => {
  let lockFileStr: string | null = null;
  try {
    lockFileStr = await readFile(getLockFilePath(), 'utf-8');
  } catch (e: unknown) {
    if (e instanceof Error && e['code'] == 'ENOENT') {
      throw new errors.MissingLockfileError();
    }
    throw e;
  }
  const lockFileLines = lockFileStr.split('\n');
  if (lockFileLines.length !== 3) {
    throw new errors.CorruptedLockfileError();
  }
  return {
    lockedFilePath: lockFileLines[0],
    postType: lockFileLines[1],
    postId: lockFileLines[2]
  };
};

const throwOnLockFile = async (): Promise<void> => {
  if (await fileExists(getLockFilePath())) {
    throw new errors.LockedDataError();
  }
};

const deleteLockedData = async (): Promise<void> => {
  const lockData = await readLockFile();
  const lockDir = path.dirname(lockData.lockedFilePath);
  await rmDir(lockDir, { recursive: true });
};

export const deleteLockFile = async (): Promise<void> => {
  await deleteLockedData();
  await rm(getLockFilePath());
};

const getLockFilePath = (): string => {
  return path.join(getDataDir(), lockFileName);
};

const getPostPath = (postId: string): string => {
  return path.join(getDataDir(), `${postId}.json`);
};

const getDefaultPostData = <T extends PostTypeName>(postType: T): PostType<T> => {
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
  return await readJsonFile(getPostTypeIndexPath(postType));
};

const writeIndexFile = async <T extends PostTypeName>(postType: T, indexData: IndexData<T>): Promise<void> => {
  await writeJsonFile(getPostTypeIndexPath(postType), indexData);
};

const readSlugFile = async (postType: PostTypeName): Promise<SlugData> => {
  return await readJsonFile(getPostTypeSlugPath(postType));
};

const writeSlugFile = async (postType: PostTypeName, indexData: SlugData): Promise<void> => {
  await writeJsonFile(getPostTypeSlugPath(postType), indexData);
};

export const buildAllIndices = async (): Promise<void> => {
  for (const postType of Object.values(PostTypeName)) {
    await buildIndexByType(<PostTypeName>postType);
  }
};

const buildIndexByType = async <T extends PostTypeName>(postType: T): Promise<void> => {
  await ensureIndexDir(postType);
  const posts = await getPostsByType(postType);
  const indexData: IndexData<T> = {};
  const slugData: SlugData = {};
  for (const post of posts) {
    indexData[post.id] = post;
    if (post.type !== PostTypeName.Ephemera) {
      slugData[post.content.slug] = post.id;
    }
  }
  await writeIndexFile(postType, indexData);
  if (Object.keys(slugData).length > 0) {
    await writeSlugFile(postType, slugData);
  }
};

export const getIndexedPostsByType = async <T extends PostTypeName>(postType: T): Promise<PostType<T>[]> => {
  const indexData = await readIndexFile(postType);
  return Object.values(indexData);
};

export const addToIndex = async <T extends PostTypeName>(post: PostType<T>): Promise<void> => {
  const indexData = await readIndexFile(post.type);
  indexData[post.id] = post;
  await writeIndexFile(post.type, indexData);
  if (post.type !== PostTypeName.Ephemera) {
    const slugData = await readSlugFile(post.type);
    slugData[post.content.slug] = post.id;
    await writeSlugFile(post.type, slugData);
  }
};

export const isExistingSlug = async (slug: string, postType: PostTypeName): Promise<boolean> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  const slugData = await readSlugFile(postType);
  return slug in slugData;
};
