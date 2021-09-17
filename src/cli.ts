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

type Json = null | boolean | string | number | { [key: string]: Json } | Json[];

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
      const output: Json[] = [];
      for (const item of items) {
        if (item.fileData.data.created) {
          const outputItem: Json = {
            id: generateId(new Date(item.fileData.data.created).getTime()),
            type: postType,
            created: item.fileData.data.created,
            updated: item.fileData.data.updated
              ? item.fileData.data.updated
              : item.fileData.data.created,
            content: {
              text: item.fileData.content
            }
          };
          switch (postType) {
            case PostTypeName.Page:
              outputItem.content['title'] = item.fileData.data.title
                ? item.fileData.data.title
                : '';
              outputItem.content['slug'] = item.slug;
              break;
            case PostTypeName.Article:
              outputItem.content['title'] = item.fileData.data.title
                ? item.fileData.data.title
                : '';
              outputItem.content['slug'] = item.slug;
              outputItem.content['tags'] = item.fileData.data.tags ? item.fileData.data.tags : '';
              break;
            case PostTypeName.Ephemera:
              break;
          }
          output.push(outputItem);
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
