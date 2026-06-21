import path from 'path';
import { describe, test, afterEach, expect } from 'vitest';
import { mkTempDir, fileExists, rm } from './fs';
import { uploadFile, downloadFile, deleteFile } from './media';

// This test is normally not run because it assumes the dev server is running
describe.skip('Media library testing', () => {
  let uploadedFileId: string;

  afterEach(async () => {
    if (uploadedFileId) await deleteFile(uploadedFileId);
  });

  test('Can upload a file', async () => {
    const result = await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));
    expect(result.fileId).toBeTruthy();
    uploadedFileId = result.fileId;
  });

  test('Can download a file', async () => {
    const { fileId } = await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));
    uploadedFileId = fileId;
    const tempDir = await mkTempDir();
    const destPath = path.join(tempDir, 'favicon-16x16.png');

    expect(await downloadFile(fileId, destPath)).toBe(true);
    expect(await fileExists(destPath)).toBe(true);

    // Cleanup
    await rm(destPath);
  });

  test('Can delete a file', async () => {
    const { fileId } = await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));
    uploadedFileId = fileId;

    expect(await deleteFile(fileId)).toBe(true);
  });
});
