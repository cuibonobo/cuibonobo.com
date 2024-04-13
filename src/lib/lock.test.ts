import { lockRead, lockWrite, LockMode, lockDelete } from './lock';

test('Writing a lockfile and reading it back generates the same data', async () => {
  const originalLockData = {
    lockedFilePath: '/test/path',
    resourceType: 'article',
    resourceId: 'some-id',
    mode: LockMode.Edit
  };
  await lockWrite(originalLockData);
  const parsedLockData = await lockRead();
  expect(parsedLockData).toStrictEqual(originalLockData);
  await lockDelete();
});
