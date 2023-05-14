import { lockRead, lockWrite, LockMode, lockDelete } from './lock';

test('Writing a lockfile and reading it back generates the same data', async () => {
  const lockData = {
    lockedFilePath: '/test/path',
    postType: 'article',
    postId: 'some-id',
    mode: LockMode.Edit
  };
  await lockWrite(lockData);
  expect(await lockRead()).toStrictEqual(lockData);
  await lockDelete();
});