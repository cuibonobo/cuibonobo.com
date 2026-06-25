import fs from 'fs';
import path from 'path';
import mime from 'mime';
import type { AttachmentAssociation } from '@haverstack/core';
import { isNoEntryError, readFile } from './fs';
import { getStack } from './api';

export const getBaseServerUrl = (): URL => {
  const base = process.env.STACK_SERVER_URL ?? 'http://127.0.0.1:3000';
  return new URL(base.endsWith('/') ? base : base + '/');
};

export const downloadFile = async (fileId: string, destPath: string): Promise<boolean> => {
  try {
    const stack = await getStack();
    const data = await stack.getAttachment(fileId);
    fs.writeFileSync(path.resolve(destPath), data, { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
};

export const uploadFile = async (sourcePath: string): Promise<AttachmentAssociation> => {
  sourcePath = path.resolve(sourcePath);
  const mimeType = mime.getType(sourcePath) ?? 'application/octet-stream';
  const filename = path.basename(sourcePath);
  const data = await readFile(sourcePath);
  const stack = await getStack();
  const fileId = await stack.putAttachment(data, mimeType, filename);
  return { kind: 'attachment', label: filename, fileId, mimeType };
};

export const deleteFile = async (fileId: string): Promise<boolean> => {
  try {
    const stack = await getStack();
    await stack.deleteAttachment(fileId);
    return true;
  } catch {
    return false;
  }
};

export const downloadAttachments = async (
  attachments: AttachmentAssociation[],
  destDir: string
): Promise<void> => {
  for (const attachment of attachments) {
    try {
      await downloadFile(attachment.fileId, path.join(destDir, attachment.label));
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
};
