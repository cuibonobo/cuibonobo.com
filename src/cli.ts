import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { PostTypeName } from './lib/types';
import { MissingLockfileError } from './lib/errors';
import { openWithEditor, openWithFileExplorer } from './lib/fs';
import {
  createPost,
  checkoutPost,
  editPost,
  commitPost,
  getIndexedPostsByType,
  readLockFile,
  deleteLockFile,
  buildAllIndices
} from './lib/posts';
import { slugger } from './lib/slugger';

const program = new Command();
program
  .command('new <postType>')
  .description('Create a new post with the given post type')
  .action(async (postType: PostTypeName) => {
    if (Object.values(PostTypeName).indexOf(postType) < 0) {
      console.error(`Can't create posts of type '${postType}'!`);
      return;
    }
    try {
      const post = await createPost(postType);
      console.debug(`Created ${post.type} post ID ${post.id}`);
      const editorPath = await checkoutPost(post);
      exec(openWithFileExplorer(path.dirname(editorPath)));
      exec(openWithEditor(editorPath));
    } catch (e) {
      console.error(e);
    }
  });

program
  .command('list <postType>')
  .description('List existing posts of the given post type')
  .action(async (postType: PostTypeName) => {
    const posts = await getIndexedPostsByType(postType);
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
  .command('edit <postId>')
  .description('Edit an existing post that matches the given post ID')
  .action(async (postId: string) => {
    try {
      const editorPath = await editPost(postId);
      exec(openWithFileExplorer(path.dirname(editorPath)));
      exec(openWithEditor(editorPath));
    } catch (e) {
      console.error(`Couldn't edit post ID ${postId}: `, e);
    }
  });

program
  .command('status')
  .description('Show the current editing state')
  .action(async () => {
    try {
      const lockData = await readLockFile();
      console.info(`Currently editing ${lockData.postType} ID ${lockData.postId}.`);
      console.info(`Edit path: ${lockData.lockedFilePath}`);
    } catch (e) {
      console.info('Nothing is being edited.');
    }
  });

program
  .command('commit')
  .description('Save the post that is being edited to the data store')
  .action(async () => {
    try {
      await commitPost();
    } catch (e) {
      if (e instanceof MissingLockfileError) {
        console.info('There is nothing to commit.');
      } else {
        console.error("Couldn't commit: ", e);
      }
    }
  });

program
  .command('discard')
  .description('Discard the in-progress edits')
  .action(async () => {
    try {
      await deleteLockFile();
      console.info('Cleared existing editing state.');
    } catch (e) {
      console.info('Editing state was already clear.');
    }
  });

program
  .command('slugify <str>')
  .description('Convert the given string to a slug')
  .action((str: string) => {
    console.info(slugger(str));
  });

program
  .command('index')
  .description('Build indices for the post types in the data store')
  .action(async () => {
    await buildAllIndices();
  });

program.parse();
