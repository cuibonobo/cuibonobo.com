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
  resourceContent: string,
  sourceDir: string,
  destDir: string,
  relativeLinks: string[],
  absoluteLinks: string[],
  relativeToAbsolute = true
): Promise<string> => {
  let updatedResourceContent = resourceContent;
  for (let i = 0; i < absoluteLinks.length; i++) {
    try {
      await copyFile(path.join(sourceDir, relativeLinks[i]), path.join(destDir, relativeLinks[i]));
      if (relativeToAbsolute) {
        updatedResourceContent = replaceAll(
          updatedResourceContent,
          `](${relativeLinks[i]}`,
          `](${absoluteLinks[i]}`
        );
      } else {
        updatedResourceContent = replaceAll(
          updatedResourceContent,
          `](${absoluteLinks[i]}`,
          `](${relativeLinks[i]}`
        );
      }
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
  return updatedResourceContent;
};

export const copyMediaToTemp = async (
  resourceContent: string,
  resourceCreated: Date,
  destDir: string
): Promise<string> => {
  const sourceDir = getAbsoluteMediaDir(resourceCreated);
  if (!(await dirExists(sourceDir))) {
    return resourceContent;
  }
  const absoluteLinks = getAbsoluteMediaLinks(resourceContent);
  const relativeLinks = absoluteLinks.map((link: string) => path.basename(link));
  return await copyMedia(resourceContent, sourceDir, destDir, relativeLinks, absoluteLinks, false);
};

export const copyMediaToStorage = async (
  resourceContent: string,
  resourceCreated: Date,
  sourceDir: string
): Promise<string> => {
  const destDir = getAbsoluteMediaDir(resourceCreated);
  const mediaDir = getMediaDir(resourceCreated);
  await ensureDir(destDir);
  const relativeLinks = getRelativeMediaLinks(resourceContent);
  const absoluteLinks = relativeLinks.map((link: string) =>
    path.join(mediaDir, link).replace(/\\/g, '/')
  );
  return await copyMedia(resourceContent, sourceDir, destDir, relativeLinks, absoluteLinks, true);
};
