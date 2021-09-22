import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';
import glob from 'glob';
import yaml from 'yaml';
import matter from 'gray-matter';
import { PostTypeName, PostType } from './types';
import { generateId } from './id';

const yamlDivider = '---';
const yamlPlaceholder = '.';
const lockFileName = '.lock';

const readFile = util.promisify(fs.readFile);
const rm = util.promisify(fs.unlink);
const rmDir = util.promisify(fs.rmdir);
const getFiles = util.promisify(glob);
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
  } catch (e) {
    if (e.code == 'ENOENT') {
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
  } catch (e) {
    if (e.code == 'ENOENT') {
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
  const postData = getdefaultPostData(postType);
  await writePost(postData);
  return postData;
};

export const editPost = async (postId: string, postType: PostTypeName): Promise<string> => {
  const post = await readPost(postId, postType);
  return await checkoutPost(post);
};

const readPost = async (postId: string, postType: PostTypeName): Promise<PostType> => {
  const postPath = getPostPath(postId, postType);
  return readPostFromPath(postPath);
};

const readPostFromPath = async (postPath: string): Promise<PostType> => {
  const fileStr: string = await readFile(postPath, 'utf-8');
  const post = JSON.parse(fileStr);
  post.created = new Date(post.created);
  post.updated = new Date(post.updated);
  return post;
};

const writePost = async (post: PostType): Promise<void> => {
  const postPath = getPostPath(post.id, post.type);
  await ensureDir(path.dirname(postPath));
  await writeFile(postPath, getJsonString(post));
};

export const checkoutPost = async (post: PostType): Promise<string> => {
  throwOnLockFile();
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
      yamlDivider
    ]);
  }
  const editorFile = path.join(editorDir, `${post.id}.md`);
  await writeFile(editorFile, postOutput.join('\n') + text);
  await writeLockFile(post.id, post.type, editorFile);
  return editorFile;
};

export const commitPost = async (): Promise<void> => {
  const lockData = await readLockFile();
  const post = await readPost(lockData.postId, lockData.postType as PostTypeName);
  const fileStr: string = await readFile(lockData.lockedFilePath, 'utf-8');
  const fileData = matter(fileStr);
  if (post.content.text) {
    post.updated = new Date();
  }
  post.content.text = fileData.content;
  switch (lockData.postType) {
    case PostTypeName.Page:
      post.content['title'] = fileData.data.title ? fileData.data.title : '';
      post.content['slug'] = fileData.data.slug;
      break;
    case PostTypeName.Article:
      post.content['title'] = fileData.data.title ? fileData.data.title : '';
      post.content['slug'] = fileData.data.slug;
      post.content['tags'] = fileData.data.tags ? fileData.data.tags : '';
      break;
    case PostTypeName.Ephemera:
      break;
  }
  await writePost(post);
  await deleteLockFile();
};

export const getPostsByType = async (postType: PostTypeName): Promise<PostType[]> => {
  const postDir = path.join(getDataDir(), postType);
  const fileList = await getFiles(path.join(postDir, '**', '*.json'));
  const items = await Promise.all(
    fileList.map(async (filePath) => {
      return await readPostFromPath(filePath);
    })
  );
  return items.sort((a, b) => b.created.getTime() - a.created.getTime());
};

export const getPostBySlug = async (slug: string, postType: PostTypeName): Promise<PostType> => {
  if (postType === PostTypeName.Ephemera) {
    throw new Error('Ephemera do not have slugs!');
  }
  // FIXME: This is extremely inefficient. Posts should be indexed somehow.
  const posts = await getPostsByType(postType);
  for (const post of posts) {
    if (post.content['slug'] == slug) {
      return post;
    }
  }
  throw new Error(`No ${postType} posts contain slug '${slug}!'`);
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
  const lockFileStr = await readFile(getLockFilePath(), 'utf-8');
  const lockFileLines = lockFileStr.split('\n');
  if (lockFileLines.length !== 3) {
    throw new Error('Corrupted lock file!');
  }
  return {
    lockedFilePath: lockFileLines[0],
    postType: lockFileLines[1],
    postId: lockFileLines[2]
  };
};

const throwOnLockFile = async (): Promise<void> => {
  if (await fileExists(getLockFilePath())) {
    throw new Error('Data is locked!');
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

const getPostPath = (postId: string, postType: PostTypeName): string => {
  return path.join(getDataDir(), postType, `${postId}.json`);
};

const getdefaultPostData = (postTypeName: PostTypeName): PostType => {
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

const buildIndex = async (postType: PostTypeName): Promise<void> => {
  const indexPath = path.join(path.resolve('static'), `${postType}.json`);
  const posts = await getPostsByType(postType);
  const index: { [key: string]: PostType } = {};
  for (const post of posts) {
    if (postType === PostTypeName.Ephemera) {
      index[post.id] = post;
    } else {
      index[post.content['slug']] = post;
    }
  }
  await writeFile(indexPath, getJsonString(index));
};

export const buildIndices = async (): Promise<void> => {
  for (const postType of Object.values(PostTypeName)) {
    await buildIndex(postType);
  }
};
