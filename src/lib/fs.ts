import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';
import yaml from 'yaml';
import matter from 'gray-matter';
import { PostTypeName, PostType } from './types';
import { generateId } from './id';
import { slugger } from './slugger';
import * as errors from './errors';

const yamlDivider = '---';
const yamlPlaceholder = '.';
const lockFileName = '.lock';

const readFile = util.promisify(fs.readFile);
const readDir = util.promisify(fs.readdir);
const rm = util.promisify(fs.unlink);
const rmDir = util.promisify(fs.rmdir);
const mkDir = util.promisify(
  (
    path: string,
    options: fs.MakeDirectoryOptions = {},
    callback: (err: NodeJS.ErrnoException, path?: string) => void
  ) => {
    options.recursive = true;
    return fs.mkdir(path, options, callback);
  }
);
const lstat = util.promisify(fs.lstat);

export const writeFile = util.promisify(fs.writeFile);

export const mkTempDir = util.promisify(
  (callback: (err: NodeJS.ErrnoException, folder: string) => void) => {
    return fs.mkdtemp(path.join(os.tmpdir(), 'cuibonobo-'), callback);
  }
);

export const openWithEditor = (path: string): string => {
  let editor: string;
  switch (process.platform) {
    case 'win32':
      editor = 'start ""';
      break;
    case 'darwin':
      editor = 'open';
      break;
    default:
      editor = '${VISUAL-${EDITOR-nano}}';
      break;
  }
  return `${editor} "${path}"`;
};

export const openWithFileExplorer = (path: string): string => {
  let explorer: string;
  switch (process.platform) {
    case 'win32':
      explorer = 'explorer';
      break;
    case 'darwin':
      explorer = 'open --';
      break;
    default:
      explorer = 'xdg-open --';
      break;
  }
  return `${explorer} "${path}"`;
};

export const ensureDir = async (path: string): Promise<void> => {
  try {
    const f = await lstat(path);
    if (f.isFile()) {
      await mkDir(path, { recursive: true });
    }
  } catch (e: unknown) {
    if (e instanceof Error && e['code'] == 'ENOENT') {
      await mkDir(path, { recursive: true });
      return;
    }
    throw e;
  }
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    const f = await lstat(path);
    return f.isFile();
  } catch (e: unknown) {
    if (e instanceof Error && e['code'] == 'ENOENT') {
      return false;
    }
    throw e;
  }
};

const getDataDir = (): string => {
  return path.resolve('data');
};

const getJsonString = (json: PostType | Record<string, unknown>): string => {
  return JSON.stringify(json, null, 2) + '\n';
};

export const createPost = async (postType: PostTypeName): Promise<PostType> => {
  const postData = getDefaultPostData(postType);
  await writePost(postData);
  return postData;
};

export const editPost = async (postId: string): Promise<string> => {
  const post = await readPost(postId);
  return await checkoutPost(post);
};

const readPost = async (postId: string): Promise<PostType> => {
  const postPath = getPostPath(postId);
  return readPostFromPath(postPath);
};

const readPostFromPath = async (postPath: string): Promise<PostType> => {
  const fileStr: string = await readFile(postPath, 'utf-8');
  const post: PostType = <PostType>JSON.parse(fileStr);
  post.created = new Date(post.created);
  post.updated = new Date(post.updated);
  return post;
};

const writePost = async (post: PostType): Promise<void> => {
  const postPath = getPostPath(post.id);
  await writeFile(postPath, getJsonString(post));
};

export const checkoutPost = async (post: PostType): Promise<string> => {
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

export const commitPost = async (): Promise<void> => {
  const lockData = await readLockFile();
  const post: PostType = await readPost(lockData.postId);
  const fileStr: string = await readFile(lockData.lockedFilePath, 'utf-8');
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
  switch (lockData.postType) {
    case PostTypeName.Page:
      post.content['title'] = fileData.data.title ? <string>fileData.data.title : '';
      post.content['slug'] = fileData.data.slug
        ? <string>fileData.data.slug
        : convertTitleToSlug(fileData.data.title);
      break;
    case PostTypeName.Article:
      post.content['title'] = fileData.data.title ? <string>fileData.data.title : '';
      post.content['slug'] = fileData.data.slug
        ? <string>fileData.data.slug
        : convertTitleToSlug(fileData.data.title);
      post.content['tags'] = fileData.data.tags ? <string>fileData.data.tags : '';
      break;
    case PostTypeName.Ephemera:
      break;
  }
  await writePost(post);
  await deleteLockFile();
  await buildIndices();
};

export const getAllPosts = async (): Promise<PostType[]> => {
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
  return items.sort((a, b) => b.created.getTime() - a.created.getTime());
};

export const getPostsByType = async (postType: PostTypeName): Promise<PostType[]> => {
  const allPosts = await getAllPosts();
  const items: PostType[] = [];
  for (const post of allPosts) {
    if (post.type == postType) {
      items.push(post);
    }
  }
  return items;
};

export const getPostById = async (postId: string): Promise<PostType> => {
  return readPost(postId);
};

export const getPostBySlug = async (slug: string, postType: PostTypeName): Promise<PostType> => {
  if (postType === PostTypeName.Ephemera) {
    throw new errors.PostTypeError('Ephemera do not have slugs!');
  }
  // FIXME: This is extremely inefficient. Posts should be indexed somehow.
  const posts = await getPostsByType(postType);
  for (const post of posts) {
    if (post.content['slug'] == slug) {
      return post;
    }
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

export const readLockFile = async (): Promise<{
  lockedFilePath: string;
  postType: string;
  postId: string;
}> => {
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

const getDefaultPostData = (postTypeName: PostTypeName): PostType => {
  const now = new Date();
  const postData = {
    id: generateId(now.getTime()),
    created: now,
    updated: now
  };
  switch (postTypeName) {
    case PostTypeName.Page:
      return {
        type: PostTypeName.Page,
        ...postData,
        content: {
          title: yamlPlaceholder,
          slug: yamlPlaceholder,
          text: ''
        }
      };
    case PostTypeName.Article:
      return {
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
      return { type: PostTypeName.Ephemera, ...postData, content: { text: '' } };
  }
};

export const buildIndices = async (): Promise<void> => {
  const allPosts = await getAllPosts();
  const indexData: { [key: string]: { path: string; data: { [key: string]: PostType } } } = {};
  for (const post of allPosts) {
    if (!(post.type in indexData)) {
      indexData[post.type] = {
        path: path.join(path.resolve('static'), `${post.type}.json`),
        data: {}
      };
    }
    if (post.type === PostTypeName.Ephemera) {
      indexData[post.type].data[post.id] = post;
    } else {
      indexData[post.type].data[post.content['slug']] = post;
    }
  }
  for (const postType of Object.keys(indexData)) {
    await writeFile(indexData[postType].path, getJsonString(indexData[postType].data));
  }
};
