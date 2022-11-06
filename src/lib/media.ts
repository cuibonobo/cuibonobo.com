import path from 'path';
import { copyFile, dirExists, ensureDir, isNoEntryError } from './fs';
import { getAbsoluteMediaLinks, getRelativeMediaLinks } from './parser';

const getMediaDir = (created: Date): string => {
  const year = String(created.getFullYear()).padStart(4, '0');
  const month = String(created.getMonth() + 1).padStart(2, '0');
  return path.join('/media', year, month);
};

const getAbsoluteMediaDir = (created: Date): string => {
  return path.join(path.resolve('static'), getMediaDir(created).substring(1));
};

const replaceAll = (searchText: string, searchStr: string, replaceStr: string): string => {
  let updatedSearchText = searchText;
  while (updatedSearchText.indexOf(searchStr) >= 0) {
    updatedSearchText = updatedSearchText.replace(searchStr, replaceStr);
  }
  return updatedSearchText;
};

const copyMedia = async (
  postContent: string, sourceDir: string, destDir: string, relativeLinks: string[], absoluteLinks: string[],
  relativeToAbsolute: boolean = true
): Promise<string> => {
  let updatedPostContent = postContent;
  for (let i = 0; i < absoluteLinks.length; i++) {
    try {
      await copyFile(path.join(sourceDir, relativeLinks[i]), path.join(destDir, relativeLinks[i]));
      if (relativeToAbsolute) {
        updatedPostContent = replaceAll(updatedPostContent, `](${relativeLinks[i]}`, `](${absoluteLinks[i]}`);
      } else {
        updatedPostContent = replaceAll(updatedPostContent, `](${absoluteLinks[i]}`, `](${relativeLinks[i]}`);
      }
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
  return updatedPostContent;
};

export const copyMediaToTemp = async (postContent: string, postCreated: Date, destDir: string): Promise<string> => {
  const sourceDir = getAbsoluteMediaDir(postCreated);
  if (!(await dirExists(sourceDir))) {
    return postContent;
  }
  const absoluteLinks = getAbsoluteMediaLinks(postContent);
  const relativeLinks = absoluteLinks.map((link:string) => path.basename(link));
  return await copyMedia(postContent, sourceDir, destDir, relativeLinks, absoluteLinks, false);
};

export const copyMediaToStorage = async (postContent: string, postCreated: Date, sourceDir: string): Promise<string> => {
  const destDir = getAbsoluteMediaDir(postCreated);
  const mediaDir = getMediaDir(postCreated);
  await ensureDir(destDir);
  const relativeLinks = getRelativeMediaLinks(postContent);
  const absoluteLinks = relativeLinks.map((link: string) => path.join(mediaDir, link).replace(/\\/g, '/'));
  return await copyMedia(postContent, sourceDir, destDir, relativeLinks, absoluteLinks, true);
};
