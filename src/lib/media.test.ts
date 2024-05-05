import path from 'path';
import { describe, test, afterEach, expect } from 'vitest';
import { mkTempDir, fileExists, rm } from './fs';
import { uploadFile, downloadFile, deleteFile } from './media';

const FAVICON_ID = 'fcfccf93f74a574c01098dc5efc5b137d9cb4bfebe1962f88ab36e96b34779e7';

// This test is normally not run because it assumes the dev server is running
describe.skip('Media library testing', () => {
  afterEach(async () => {
    await deleteFile(FAVICON_ID);
  });

  test('Can upload a file', async () => {
    const bucketFile = await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));
    expect(bucketFile.hash).toEqual(FAVICON_ID);
  });

  test('Can download a file', async () => {
    // Upload first to ensure it exists
    await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));
    const tempDir = await mkTempDir();
    const destPath = path.join(tempDir, 'favicon-16x16.png');

    expect(await downloadFile(FAVICON_ID, destPath)).toBe(true);
    expect(await fileExists(destPath)).toBe(true);

    // Cleanup
    await rm(destPath);
  });

  test('Can delete a file', async () => {
    // Upload first to ensure it exists
    await uploadFile(path.join(__dirname, '../../static/favicon-16x16.png'));

    expect(await deleteFile(FAVICON_ID)).toBe(true);
  });
});
