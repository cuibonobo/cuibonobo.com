import path from 'path';
import type { AttachmentAssociation } from '@haverstack/core';
import { ResourceTypeName, ResourceType } from './types';
import {
  getResource,
  createResource,
  updateResource,
  getResourceBySlug,
  getPageMetaForRecord,
  getPageMetaBySlug,
  createPageMeta,
  updatePageMeta,
  getStack
} from './api';
import { mkTempDir, writeFile, readFile, rm, rmDir, dirExists, fileExists, readDir } from './fs';
import {
  getDefaultResourceData,
  getFrontMatter,
  appendDataToResource,
  parseFrontmatter
} from './resources';
import { downloadAttachments, uploadFile } from './media';
import { slugger } from './slugger';
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
  const extraFields =
    resourceType === ResourceTypeName.Article ? { slug: '.' } : undefined;
  return await lockResource(resource, LockMode.New, extraFields);
};

export const lockEdit = async (resourceId: string): Promise<LockData> => {
  const resource = await getResource(resourceId);
  let extraFields: Record<string, unknown> | undefined;
  if (resource.type === ResourceTypeName.Article) {
    const meta = await getPageMetaForRecord(resource.id);
    extraFields = { slug: meta?.content.slug ?? '.' };
  }
  return await lockResource(resource, LockMode.Edit, extraFields);
};

const lockResource = async <T extends ResourceTypeName>(
  resource: ResourceType<T>,
  mode: LockMode,
  extraFields?: Record<string, unknown>
): Promise<LockData> => {
  await throwOnLock();
  const editorDir = await mkTempDir();
  const frontMatter = getFrontMatter(resource, extraFields);
  const lockedFilePath = path.join(editorDir, `${resource.id}.md`);
  const attachments = resource.associations.filter(
    (a): a is AttachmentAssociation => a.kind === 'attachment'
  );
  await downloadAttachments(attachments, editorDir);
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

  // Slug uniqueness check for pages (pages carry slug in content)
  if (resource.type === ResourceTypeName.Page) {
    try {
      const slugmatch = await getResourceBySlug(resource.content.slug, ResourceTypeName.Page);
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
    resource.updatedAt = new Date();
  }
  const dataDir = path.dirname(lockData.lockedFilePath);
  // Collect absolute paths of all files in the data directory that aren't the locked resource file
  const files = (await readDir(dataDir))
    .map((f) => path.join(dataDir, f))
    .filter((f) => f !== lockData.lockedFilePath);

  const stack = await getStack();

  // Capture existing attachment associations before any mutations
  const existingAttachments = resource.associations.filter(
    (a): a is AttachmentAssociation => a.kind === 'attachment'
  );

  if (lockData.mode === LockMode.New) {
    await createResource(resource);
  } else {
    await updateResource(resource.id, resource);
    for (const assoc of existingAttachments) {
      await stack.dissociate(resource.id, assoc);
      try {
        await stack.deleteAttachment(assoc.fileId);
      } catch {
        // File may be referenced elsewhere or already deleted
      }
    }
  }

  for (const filePath of files) {
    const assoc = await uploadFile(filePath);
    await stack.associate(resource.id, assoc);
  }

  // Articles use page-meta to store slug
  if (resource.type === ResourceTypeName.Article) {
    const frontmatterData = parseFrontmatter(fileStr);
    const rawSlug = frontmatterData.slug as string | undefined;
    const slug =
      rawSlug && rawSlug !== '.' ? rawSlug : slugger(resource.content.title);

    const existingBySlug = await getPageMetaBySlug(slug);
    if (existingBySlug && existingBySlug.parentId !== resource.id) {
      throw new errors.ResourceError(`The slug '${slug}' already exists!`);
    }

    const existingMeta = await getPageMetaForRecord(resource.id);
    if (existingMeta) {
      await updatePageMeta(existingMeta.id, slug);
    } else {
      await createPageMeta(resource.id, slug);
    }
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
