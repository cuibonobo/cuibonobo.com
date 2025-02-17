import path from 'path';
import { ResourceTypeName, ResourceType, resourceTypeToJson } from './types';
import { getResource, createResource, updateResource, getResourceBySlug } from './api';
import { mkTempDir, writeFile, readFile, rm, rmDir, dirExists, fileExists, readDir } from './fs';
import { getDefaultResourceData, getFrontMatter, appendDataToResource } from './resources';
import { downloadAttachments, uploadFiles } from './media';
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

export const lockCreate = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<LockData> => {
  const resource = getDefaultResourceData(resourceType);
  resource.is_public = true;
  return await lockResource(resource, LockMode.New);
};

export const lockEdit = async (resourceId: string): Promise<LockData> => {
  const resource = await getResource(resourceId);
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
  await downloadAttachments(resource.attachments, editorDir);
  await writeFile(lockedFilePath, frontMatter + resource.content.text);
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
  let resource: ResourceType<T>;
  try {
    resource = await getResource(lockData.resourceId);
  } catch (e: unknown) {
    resource = getDefaultResourceData<T>(lockData.resourceType as T);
    resource.id = lockData.resourceId;
  }
  const fileStr: string = await readFile(lockData.lockedFilePath, 'utf-8');
  resource = appendDataToResource(resource, fileStr);
  if (resource.type !== ResourceTypeName.Note) {
    try {
      const slugmatch = await getResourceBySlug(resource.content.slug.toString(), resource.type);
      if (slugmatch.id !== resource.id) {
        throw new errors.ResourceError(
          `The slug '${resource.content.slug}' already exists for resource ${slugmatch.id}!`
        );
      }
    } catch (_: unknown) {
      // Continue if no slug matches were found
    }
  }
  if (lockData.mode === LockMode.Edit) {
    resource.updated_date = new Date();
  }
  const dataDir = path.dirname(lockData.lockedFilePath);
  // Collect absolute paths of all files in the data directory that aren't the locked resource file
  const files = (await readDir(dataDir))
    .map((f) => path.join(dataDir, f))
    .filter((f) => f !== lockData.lockedFilePath);
  resource.attachments = await uploadFiles(files, 'content:text');
  if (lockData.mode === LockMode.New) {
    await createResource(resourceTypeToJson(resource));
  } else {
    await updateResource(resource.id, resourceTypeToJson(resource));
  }
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
    if (e instanceof Error && 'code' in e && e.code == 'ENOENT') {
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
  return path.join(path.resolve('static'), lockFileName);
};
