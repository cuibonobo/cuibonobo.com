import path from 'path';
import { ResourceTypeName, ResourceType } from './types';
import { mkTempDir, writeFile, readFile, rm, rmDir, dirExists, fileExists } from './fs';
import {
  getResourcesDir,
  getDefaultResourceData,
  writeResource,
  readResource,
  getFrontMatter,
  appendDataToResource
} from './resources';
import { copyMediaToTemp, copyMediaToStorage } from './media';
import * as errors from './errors';

const lockFileName = '.lock';

export enum LockMode {
  New = 'new',
  Edit = 'edit'
}

interface LockData {
  lockedFilePath: string;
  mode: LockMode;
  resourceType: string;
  resourceId: string;
}

const createResourceFile = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<ResourceType<T>> => {
  const resourceData = getDefaultResourceData(resourceType);
  await writeResource(resourceData);
  return resourceData;
};

export const lockCreate = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<LockData> => {
  const resource = await createResourceFile(resourceType);
  return await lockResource(resource, LockMode.New);
};

export const lockEdit = async (resourceId: string): Promise<LockData> => {
  const resource = await readResource(resourceId);
  return await lockResource(resource, LockMode.Edit);
};

const lockResource = async <T extends ResourceTypeName>(
  resource: ResourceType<T>,
  mode: LockMode
): Promise<LockData> => {
  await throwOnLock();
  const editorDir = await mkTempDir();
  const frontMatter = getFrontMatter(resource);
  const lockedFilePath = path.join(editorDir, `${resource.id}.md`);
  const resourceContent = await copyMediaToTemp(resource.content.text, resource.created, editorDir);
  await writeFile(lockedFilePath, frontMatter + resourceContent);
  const lockData: LockData = {
    lockedFilePath,
    resourceId: resource.id,
    resourceType: resource.type,
    mode
  };
  await lockWrite(lockData);
  return lockData;
};

export const lockCommit = async <T extends ResourceTypeName>(): Promise<void> => {
  const lockData = await lockRead();
  let resource: ResourceType<T> = await readResource(lockData.resourceId);
  const fileStr: string = await readFile(lockData.lockedFilePath, 'utf-8');
  resource = appendDataToResource(resource, fileStr);
  if (lockData.mode === LockMode.Edit) {
    resource.updated = new Date();
  }
  resource.content.text = await copyMediaToStorage(
    resource.content.text,
    resource.created,
    path.dirname(lockData.lockedFilePath)
  );
  if (lockData.mode === LockMode.New && resource.type !== ResourceTypeName.Ephemera) {
    throw new errors.ResourceError(`The slug '${resource.content.slug}' already exists!`);
  }
  await writeResource(resource);
  await lockDelete();
};

export const lockWrite = async (lockData: LockData): Promise<void> => {
  const lockLines = [
    lockData.lockedFilePath,
    lockData.mode,
    lockData.resourceType,
    lockData.resourceId
  ];
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
    resourceType: lockFileLines[2],
    resourceId: lockFileLines[3]
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
  return path.join(getResourcesDir(), lockFileName);
};
