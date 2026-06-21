import fs from 'fs';
import path from 'path';
import type * as streamWeb from 'node:stream/web';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import mime from 'mime';
import { isNoEntryError, readFile } from './fs';
import { Attachment } from '@codec/attachment';
import { getAuthHeaders } from './auth';

// Node fetch is not the same as web fetch! Source: https://stackoverflow.com/a/75843145
declare global {
  interface Response {
    readonly body: streamWeb.ReadableStream<Uint8Array> | null;
  }
}

export const getBaseServerUrl = (): URL => {
  const base = process.env.STACK_SERVER_URL ?? 'http://127.0.0.1:3000';
  return new URL(base.endsWith('/') ? base : base + '/');
};

export const downloadFile = async (fileId: string, destPath: string): Promise<boolean> => {
  try {
    const response = await fetch(new URL(`attachments/${fileId}`, getBaseServerUrl()), {
      headers: getAuthHeaders()
    });
    const fileStream = fs.createWriteStream(path.resolve(destPath), { flags: 'wx' });
    await finished(Readable.fromWeb(response.body!).pipe(fileStream));
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
  const response = await fetch(new URL('attachments', getBaseServerUrl()), {
    method: 'POST',
    body: data,
    headers: {
      ...getAuthHeaders(),
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`Failed to upload ${filename}: ${await response.text()}`);
  }
  return response.json() as Promise<{ fileId: string }>;
};

export const deleteFile = async (fileId: string): Promise<boolean> => {
  const response = await fetch(new URL(`attachments/${fileId}`, getBaseServerUrl()), {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.status >= 200 && response.status < 400;
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
