import fs from 'fs';
import util from 'util';
import path from 'path';
import glob from 'glob';
import matter, { GrayMatterFile } from 'gray-matter';

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

const getDefaultEditor = (): string => {
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

const getMarkdownItem = async (
  subDirs: string[],
  slug: string
): Promise<GrayMatterFile<string>> => {
  const filePath = getDataPath(subDirs, slug);
  const fileStr: string = await readFile(filePath, 'utf-8');
  return matter(fileStr);
};

const getMarkdownItems = async (
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
  return items.sort((a, b) => b.fileData.data.published - a.fileData.data.published);
};

const getPageData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; published: Date } => {
  return {
    content: fileData.content,
    title: fileData.data.title,
    published: new Date(fileData.data.published)
  };
};

const getEphemeraData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; published: Date } => {
  return {
    content: fileData.content,
    published: new Date(fileData.data.published)
  };
};

const getArticleData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; published: Date; updated: Date | null; tags: string } => {
  return {
    content: fileData.content,
    title: fileData.data.title,
    published: new Date(fileData.data.published),
    updated: fileData.data.updated ? new Date(fileData.data.published) : null,
    tags: fileData.data.tags
  };
};

export {
  getMarkdownItem,
  getMarkdownItems,
  getPageData,
  getEphemeraData,
  getArticleData,
  getDefaultEditor,
  ensureDir,
  getDataDir,
  writeFile
};
