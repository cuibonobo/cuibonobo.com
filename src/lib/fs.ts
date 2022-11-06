import fs from 'fs';
import os from 'os';
import util from 'util';
import path from 'path';

export const readFile = util.promisify(fs.readFile);
export const readDir = util.promisify(fs.readdir);
export const rm = util.promisify(fs.unlink);
export const rmDir = util.promisify(fs.rmdir);
export const copyFile = util.promisify(fs.copyFile);
const mkDirp = util.promisify(
  (path: string, callback: (err: NodeJS.ErrnoException, path?: string) => void) => {
    return fs.mkdir(path, { recursive: true }, callback);
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

export const isNoEntryError = (e: unknown): boolean => {
  return typeof e === 'object' && 'code' in e && e['code'] == 'ENOENT';
};

export const ensureDir = async (path: string): Promise<void> => {
  try {
    const f = await lstat(path);
    if (f.isFile()) {
      await mkDirp(path);
    }
  } catch (e: unknown) {
    if (isNoEntryError(e)) {
      await mkDirp(path);
      return;
    }
    throw e;
  }
};

export const dirExists = async (path: string): Promise<boolean> => {
  try {
    const f = await lstat(path);
    return f.isDirectory();
  } catch (e: unknown) {
    if (isNoEntryError(e)) {
      return false;
    }
    throw e;
  }
};

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    const f = await lstat(path);
    return f.isFile();
  } catch (e: unknown) {
    if (isNoEntryError(e)) {
      return false;
    }
    throw e;
  }
};

export const readJsonFile = async <T>(path: string): Promise<T> => {
  return <T>JSON.parse(await readFile(path, 'utf-8'));
};

export const writeJsonFile = async <T>(path: string, data: T): Promise<void> => {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n');
};
