import { lockRead, lockWrite, LockMode, lockDelete } from './lock';

test('Writing a lockfile and reading it back generates the same data', async () => {
  const lockData = {
    lockedFilePath: '/test/path',
    postType: 'article',
    postId: 'some-id',
    mode: LockMode.Edit
  };
  console.log('before lock write');
  await lockWrite(lockData);
  console.log('after lock write');
  expect(await lockRead()).toStrictEqual(lockData);
  console.log('before lock delete');
  await lockDelete();
  console.log('after lock delete');
});
