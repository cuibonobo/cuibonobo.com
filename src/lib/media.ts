import fs from 'fs';
import path from 'path';
import type * as streamWeb from 'node:stream/web';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import dotenv from 'dotenv';
import mime from 'mime';
import { isNoEntryError, readFile } from './fs';
import { Attachment } from '@codec/resource';
import { BucketFile } from '@codec/bucket';

// Node fetch is not the same as web fetch! Source: https://stackoverflow.com/a/75843145
declare global {
  interface Response {
    readonly body: streamWeb.ReadableStream<Uint8Array> | null;
  }
}

dotenv.config();

const BASE_URL =
  process.env.NODE_ENV == 'production'
    ? 'https://cuibonobo.com/media/'
    : 'http://127.0.0.1:8788/media/';

export const getBaseMediaUrl = (): URL => {
  return new URL(BASE_URL);
};

export const downloadFile = async (fileId: string, destPath: string): Promise<boolean> => {
  try {
    const response = await fetch(new URL(fileId, getBaseMediaUrl()));
    const fileStream = fs.createWriteStream(path.resolve(destPath), { flags: 'wx' });
    await finished(Readable.fromWeb(response.body).pipe(fileStream));
    return true;
  } catch {
    return false;
  }
};

export const uploadFile = async (
  sourcePath: string
): Promise<BucketFile> => {
  sourcePath = path.resolve(sourcePath);
  const file = new Blob([await readFile(sourcePath)], { type: mime.getType(sourcePath) });
  const formData = new FormData();
  formData.set('files', file, path.basename(sourcePath));
  const response = await fetch(getBaseMediaUrl(), { method: 'POST', body: formData });
  const bucketFile: BucketFile[] = (await response.json()) as BucketFile[];
  return bucketFile[0];
};

export const deleteFile = async (fileId: string) => {
  const response = await fetch(new URL(fileId, getBaseMediaUrl()), { method: 'DELETE' });
  return response.status >= 200 && response.status < 400;
};

export const downloadAttachments = async (
  attachments: Attachment[],
  destDir: string
): Promise<void> => {
  for (let i = 0; i < attachments.length; i++) {
    try {
      await downloadFile(attachments[i].id, path.join(destDir, attachments[i].name));
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
};

export const uploadAttachments = async (
  attachments: Attachment[],
  sourceDir: string
): Promise<void> => {
  for (let i = 0; i < attachments.length; i++) {
    try {
      await uploadFile(path.join(sourceDir, attachments[i].name));
    } catch (e: unknown) {
      if (!isNoEntryError(e)) {
        throw e;
      }
    }
  }
};
