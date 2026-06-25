import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { isNoEntryError, readFile } from './fs';
import { Attachment } from '@codec/attachment';
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

export const uploadFile = async (sourcePath: string): Promise<{ fileId: string }> => {
  sourcePath = path.resolve(sourcePath);
  const mimeType = mime.getType(sourcePath) ?? 'application/octet-stream';
  const filename = path.basename(sourcePath);
  const data = await readFile(sourcePath);
  const stack = await getStack();
  const fileId = await stack.putAttachment(data, mimeType, filename);
  return { fileId };
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
  attachments: Attachment[],
  destDir: string
): Promise<void> => {
  for (const attachment of attachments) {
    try {
      await downloadFile(attachment.fileId, path.join(destDir, attachment.name));
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
};

export const uploadFiles = async (files: string[], tag: string): Promise<Attachment[]> => {
  const attachments: Attachment[] = [];
  for (const filePath of files) {
    try {
      const { fileId } = await uploadFile(filePath);
      attachments.push({ fileId, name: path.basename(filePath), tag });
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
  return attachments;
};
