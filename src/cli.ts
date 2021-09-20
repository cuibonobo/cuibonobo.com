import path from 'path';
import { Command } from 'commander';
import { PostTypeName } from './lib/types';
import {
  createPost,
  checkoutPost,
  editPost,
  commitPost,
  getPostsByType,
  readLockFile,
  deleteLockFile,
  openWithEditor,
  openWithFileExplorer
} from './lib/fs';

const program = new Command();
program
  .command('new <postType>')
  .description('Create a new post with the given post type')
  .action(async (postType) => {
    if (Object.values(PostTypeName).indexOf(postType) < 0) {
      console.error(`Can't create posts of type '${postType}'!`);
      return;
    }
    try {
      const post = await createPost(postType);
      console.debug(`Created ${post.type} post ID ${post.id}`);
      const editorPath = await checkoutPost(post);
      openWithFileExplorer(path.dirname(editorPath));
      openWithEditor(editorPath);
    } catch (e) {
      console.error(e);
    }
  });

program
  .command('list <post')
  .description('Lists the posts of the given post type')
  .action(async (postType) => {
    const posts = await getPostsByType(postType);
    posts.forEach((post) => {
      console.info(
        `${post.id}: ${
          post.type === PostTypeName.Ephemera ? post.content.text : post.content.title
        }`
      );
    });
    console.info('\n');
  });

program
  .command('edit <postType> <postId>')
  .description('Opens an existing post for editing')
  .action(async (postType, postId) => {
    try {
      const editorPath = await editPost(postId, postType);
      openWithFileExplorer(path.dirname(editorPath));
      openWithEditor(editorPath);
    } catch (e) {
      console.error(`Couldn't edit ${postType} post ID ${postId}`, e);
    }
  });

program
  .command('commit')
  .description('Saves the post being edited to the data store')
  .action(async () => {
    try {
      await commitPost();
    } catch (e) {
      console.error("Couldn't commit", e);
    }
  });

program
  .command('discard')
  .description('Clears the editing status of the data store')
  .action(async () => {
    try {
      await deleteLockFile();
      console.info('Cleared existing editing state');
    } catch (e) {
      console.info('Editing state was already clear');
    }
  });

program
  .command('status')
  .description('Shows the current state of the data store')
  .action(async () => {
    try {
      const lockData = await readLockFile();
      console.info(`Currently editing ${lockData.postType} ID ${lockData.postId}.`);
      console.info(`Edit path: ${lockData.lockedFilePath}`);
    } catch (e) {
      console.info('Nothing is currently being edited.');
    }
  });

program.parse();
