import path from 'path';
import { PostTypeName, PostType } from './types';
import { mkTempDir, writeFile, readFile, rm, rmDir, dirExists, fileExists } from './fs';
import {
  getPostsDir,
  getDefaultPostData,
  writePost,
  readPost,
  getFrontMatter,
  isExistingSlug,
  addToIndex,
  appendDataToPost
} from './posts';
import * as errors from './errors';

const lockFileName = '.lock';

export enum LockMode {
  New = 'new',
  Edit = 'edit'
}

interface LockData {
  lockedFilePath: string;
  mode: LockMode;
  postType: string;
  postId: string;
}

const createPostFile = async <T extends PostTypeName>(postType: T): Promise<PostType<T>> => {
  const postData = getDefaultPostData(postType);
  await writePost(postData);
  return postData;
};

export const lockCreate = async <T extends PostTypeName>(postType: T): Promise<LockData> => {
  const post = await createPostFile(postType);
  return await lockPost(post, LockMode.New);
};

export const lockEdit = async (postId: string): Promise<LockData> => {
  const post = await readPost(postId);
  return await lockPost(post, LockMode.Edit);
};

const lockPost = async <T extends PostTypeName>(
  post: PostType<T>,
  mode: LockMode
): Promise<LockData> => {
  await throwOnLock();
  const editorDir = await mkTempDir();
  const frontMatter = getFrontMatter(post);
  const lockedFilePath = path.join(editorDir, `${post.id}.md`);
  await writeFile(lockedFilePath, frontMatter + post.content.text);
  const lockData: LockData = {
    lockedFilePath,
    postId: post.id,
    postType: post.type,
    mode
  };
  await lockWrite(lockData);
  return lockData;
};

export const lockCommit = async <T extends PostTypeName>(): Promise<void> => {
  const lockData = await lockRead();
  let post: PostType<T> = await readPost(lockData.postId);
  const fileStr: string = await readFile(lockData.lockedFilePath, 'utf-8');
  post = appendDataToPost(post, fileStr);
  if (lockData.mode === LockMode.Edit) {
    post.updated = new Date();
  }
  if (
    lockData.mode === LockMode.New &&
    post.type !== PostTypeName.Ephemera &&
    (await isExistingSlug(post.content.slug, post.type))
  ) {
    throw new errors.PostError(`The slug '${post.content.slug}' already exists!`);
  }
  await writePost(post);
  await lockDelete();
  await addToIndex(post);
};

export const lockWrite = async (lockData: LockData): Promise<void> => {
  const lockLines = [lockData.lockedFilePath, lockData.mode, lockData.postType, lockData.postId];
  await writeFile(getLockPath(), lockLines.join('\n'));
};

export const lockRead = async (): Promise<LockData> => {
  let lockFileStr: string | null = null;
  try {
    lockFileStr = await readFile(getLockPath(), 'utf-8');
  } catch (e: unknown) {
    if (e instanceof Error && e['code'] == 'ENOENT') {
      throw new errors.MissingLockfileError();
    }
    throw e;
  }
  const lockFileLines = lockFileStr.split('\n');
  if (lockFileLines.length !== 4) {
    throw new errors.CorruptedLockfileError();
  }
  return {
    lockedFilePath: lockFileLines[0],
    mode: <LockMode>lockFileLines[1],
    postType: lockFileLines[2],
    postId: lockFileLines[3]
  };
};

const throwOnLock = async (): Promise<void> => {
  if (await fileExists(getLockPath())) {
    throw new errors.LockedDataError();
  }
};

const deleteLockedData = async (): Promise<void> => {
  const lockData = await lockRead();
  const lockDir = path.dirname(lockData.lockedFilePath);
  if (await dirExists(lockDir)) {
    await rmDir(lockDir, { recursive: true });
  }
};

export const lockDelete = async (): Promise<void> => {
  await deleteLockedData();
  await rm(getLockPath());
};

const getLockPath = (): string => {
  return path.join(getPostsDir(), lockFileName);
};
