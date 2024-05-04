import path from 'path';
import { exec, ChildProcess } from 'child_process';
import { describe, test, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { mkTempDir, fileExists, rm } from './fs';
import { uploadFile, downloadFile, deleteFile } from './media';

const FAVICON_ID = 'fcfccf93f74a574c01098dc5efc5b137d9cb4bfebe1962f88ab36e96b34779e7';

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

describe.skip('Media library testing', () => {
  let p: ChildProcess | undefined;

  beforeAll(async () => {
    // FIXME: There aren't good tools for running Pages Functions via a Node API,
    // so we resort to calling a child process here.
    p = exec('npm run dev', (error, stdout, stderr) => {
      if (error) {
        throw Error(`Server setup error: ${error.message}`);
      }
    });
    // FIXME: Can we detect when the server is ready instead of sleeping?
    await sleep(2000);
  });

  afterAll(async () => {
    p?.kill();

    // FIXME: Can we detect when the server is ready instead of sleeping?
    await sleep(2000);
  });

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
