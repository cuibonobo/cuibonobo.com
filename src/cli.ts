import path from 'path';
import { Command } from 'commander';
import { exec } from 'child_process';
import { PostTypeName } from './lib/types';
import { generateId } from './lib/id';
import {
  createNewPost,
  getDefaultEditor,
  getMarkdownItems,
  mkTempDir,
  getPostTypeDirName
} from './lib/fs';

const program = new Command();
program
  .command('new <postType> <slug>')
  .description('Create a new post with the given post type')
  .action(async (postType, slug) => {
    if (Object.values(PostTypeName).indexOf(postType) < 0) {
      console.error(`Can't create posts of type '${postType}'!`);
      return;
    }
    const postPath = await createNewPost(postType, slug);
    exec(`${getDefaultEditor()} "${postPath}"`);
  });

program
  .command('migrate')
  .description('Migrates data to the latest version')
  .action(async () => {
    const tempDir = await mkTempDir();
    for (const postType of Object.values(PostTypeName)) {
      const tempPostDir = path.join(tempDir, postType);
      const items = await getMarkdownItems([getPostTypeDirName(postType)]);
      const output: JSON[] = [];
      for (const item of items) {
        if (item.fileData.data.published) {
          output.push(<JSON>(<unknown>{
            ...item.fileData.data,
            slug: item.slug,
            content: item.fileData.content,
            id: generateId(new Date(item.fileData.data.published).getTime())
          }));
        } else {
          console.error('Skipped file', postType, item.slug);
        }
      }
      console.debug(tempPostDir);
      console.debug(JSON.stringify(output, null, 4));
      console.debug('-------------------------------------------');
    }
  });

program.parse();
