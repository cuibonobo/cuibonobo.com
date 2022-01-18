import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { PostTypeName } from './lib/types';
import { MissingLockfileError } from './lib/errors';
import { openWithEditor, openWithFileExplorer } from './lib/fs';
import { getIndexedPostsByType, buildAllIndices } from './lib/posts';
import { lockCreate, lockEdit, lockCommit, lockRead, lockDelete } from './lib/lock';
import { slugger } from './lib/slugger';
import { writeSitemap } from './lib/sitemap';
import { writeFeeds } from './lib/feed';

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
      const lockData = await lockCreate(postType);
      console.debug(`Created ${lockData.postType} post ID ${lockData.postId}`);
      exec(openWithFileExplorer(path.dirname(lockData.lockedFilePath)));
      exec(openWithEditor(lockData.lockedFilePath));
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
      const lockData = await lockEdit(postId);
      exec(openWithFileExplorer(path.dirname(lockData.lockedFilePath)));
      exec(openWithEditor(lockData.lockedFilePath));
    } catch (e) {
      console.error(`Couldn't edit post ID ${postId}: `, e);
    }
  });

program
  .command('status')
  .description('Show the current editing state')
  .action(async () => {
    try {
      const lockData = await lockRead();
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
      await lockCommit();
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
      await lockDelete();
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

program
  .command('sitemap <origin>')
  .description('Build a sitemap for all indexed data')
  .action(async (origin: string) => {
    await writeSitemap(origin);
  });

program
  .command('feed <origin>')
  .description('Build the syndication feeds for all indexed data')
  .action(async (origin: string) => {
    await writeFeeds(origin);
  });

program.parse();
