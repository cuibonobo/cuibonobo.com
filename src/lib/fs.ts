import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';
import glob from 'glob';
import moment from 'moment';
import yaml from 'yaml';
import matter, { GrayMatterFile } from 'gray-matter';
import { PostTypeName, PostType } from './types';
import { generateId } from './id';

const yamlDivider = '---';
const yamlPlaceholder = '.';

const readFile = util.promisify(fs.readFile);
const getFiles = util.promisify(glob);
const writeFile = util.promisify(fs.writeFile);
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

export const mkTempDir = util.promisify(
  (callback: (err: NodeJS.ErrnoException, folder: string) => void) => {
    return fs.mkdtemp(path.join(os.tmpdir(), 'cuibonobo-'), callback);
  }
);

export const getDefaultEditor = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'start ""';
    case 'darwin':
      return 'open';
    default:
      return '${VISUAL-${EDITOR-nano}}';
  }
};

const ensureDir = async (path: string): Promise<void> => {
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

const getDataDir = (): string => {
  return path.resolve('data');
};

const getDataPath = (subDirs: string[], slug?: string): string => {
  const pathData = [getDataDir(), ...subDirs];
  if (slug) {
    pathData.push(`${slug}.md`);
  }
  return path.join(...pathData);
};

const getSlug = (filePath: string, basePath: string): string => {
  let relpath = filePath.substring(basePath.length);
  if (relpath.startsWith('/')) {
    relpath = relpath.slice(1);
  }
  const extIdx = relpath.indexOf('.');
  if (extIdx > -1) {
    relpath = relpath.slice(0, extIdx);
  }
  return relpath;
};

export const getMarkdownItem = async (
  subDirs: string[],
  slug: string
): Promise<GrayMatterFile<string>> => {
  const filePath = getDataPath(subDirs, slug);
  const fileStr: string = await readFile(filePath, 'utf-8');
  return matter(fileStr);
};

export const getMarkdownItems = async (
  subDirs: string[]
): Promise<{ slug: string; fileData: GrayMatterFile<string> }[]> => {
  const dirPath = getDataPath(subDirs);
  const fileList = await getFiles(path.join(dirPath, '**', '*.md'));
  const items = await Promise.all(
    fileList.map(async (filePath) => {
      const fileStr: string = await readFile(filePath, 'utf-8');
      return {
        slug: getSlug(filePath, dirPath),
        fileData: matter(fileStr)
      };
    })
  );
  return items.sort((a, b) => b.fileData.data.created - a.fileData.data.created);
};

export const createNewPost = async (postType: PostTypeName, slug?: string): Promise<string> => {
  const dataDir = getDataDir();
  let postDir: string = path.join(dataDir, getPostTypeDirName(postType));
  const postData = getdefaultPostData(postType);
  const now = moment(postData.created);
  if (postType === PostTypeName.Ephemera) {
    postDir = path.join(postDir, now.format('YYYY/MM'));
  }
  if (slug && (postData.type === PostTypeName.Page || postData.type === PostTypeName.Article)) {
    postData.content.slug = slug;
  }
  const yamlLines = yaml.stringify(postData).split('\n');
  const postOutput = [yamlDivider, ...yamlLines.slice(0, yamlLines.length - 1), yamlDivider, ''];
  await ensureDir(postDir);
  const postPath = path.join(postDir, `${slug}.md`);
  await writeFile(postPath, postOutput.join('\n'));
  return postPath;
};

export const getPageData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; created: Date } => {
  return {
    content: fileData.content,
    title: fileData.data.title,
    created: new Date(fileData.data.created)
  };
};

export const getEphemeraData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; created: Date } => {
  return {
    content: fileData.content,
    created: new Date(fileData.data.created)
  };
};

export const getArticleData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; created: Date; updated: Date | null; tags: string } => {
  return {
    content: fileData.content,
    title: fileData.data.title,
    created: new Date(fileData.data.created),
    updated: fileData.data.updated ? new Date(fileData.data.updated) : null,
    tags: fileData.data.tags
  };
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

export const getPostTypeDirName = (postTypeName: PostTypeName): string => {
  if (postTypeName === PostTypeName.Ephemera) {
    return postTypeName;
  }
  return `${postTypeName}s`;
};
