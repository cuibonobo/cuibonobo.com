import fs from 'fs';
import util from 'util';
import path from 'path';
import glob from 'glob';
import matter, { GrayMatterFile } from 'gray-matter';
import marked from 'marked';

const readFile = util.promisify(fs.readFile);
const getFiles = util.promisify(glob);

const getDataPath = (subDirs: string[], slug?: string): string => {
  const dataPath = path.resolve('data');
  const pathData = [dataPath, ...subDirs];
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

const getFilePathDate = (filePath: string, basePath: string): Date => {
  const dateParts = getSlug(filePath, basePath).split('/');
  const baseName = dateParts.pop().split('.')[0];
  const dayParts = baseName.split('-');
  return new Date(
    `${dateParts[0]}-${dateParts[1]}-${dayParts[0]}T${dayParts[1]}:${dayParts[2]}:${dayParts[3]}`
  );
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
): Promise<{ slug: string; published: Date; fileData: GrayMatterFile<string> }[]> => {
  const dirPath = getDataPath(subDirs);
  const fileList = await getFiles(path.join(dirPath, '**', '*.md'));
  return Promise.all(
    fileList.map(async (filePath) => {
      const fileStr: string = await readFile(filePath, 'utf-8');
      return {
        slug: getSlug(filePath, dirPath),
        published: getFilePathDate(filePath, dirPath),
        fileData: matter(fileStr)
      };
    })
  );
};

const getPageData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; published: Date } => {
  return {
    content: marked(fileData.content),
    title: fileData.data.title,
    published: new Date(fileData.data.published)
  };
};

const getEphemeraData = (fileData: matter.GrayMatterFile<string>): { content: string } => {
  return {
    content: marked(fileData.content)
  };
};

const getArticleData = (
  fileData: matter.GrayMatterFile<string>
): { content: string; title: string; published: Date; tags: string } => {
  return {
    content: marked(fileData.content),
    title: fileData.data.title,
    published: new Date(fileData.data.published),
    tags: fileData.data.tags
  };
};

export { getMarkdownItem, getMarkdownItems, getPageData, getEphemeraData, getArticleData };
