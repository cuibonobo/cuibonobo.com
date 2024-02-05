import path from 'path';
import matter from 'gray-matter';
import yaml from 'yaml';
import { generateId } from './id';
import { slugger } from './slugger';
import { PostTypeName, PostType, jsonToPostType } from './types';
import { writeJsonFile, readJsonFile, readDir, rm } from './fs';

const yamlDivider = '---';
const yamlPlaceholder = '.';

export const getPostsDir = (): string => {
  return path.join(path.resolve('static'), 'posts');
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

export const getPostById = async <T extends PostTypeName>(postId: string): Promise<PostType<T>> => {
  return readPost(postId);
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
