import path from 'path';
import { Command } from 'commander';
import moment from 'moment';
import { exec } from 'child_process';
import { ulid } from 'ulid';
import {
  getDataDir,
  getDefaultEditor,
  ensureDir,
  writeFile,
  getMarkdownItems,
  mkTempDir
} from './lib/fs';

enum PostTypes {
  Page = 'pages',
  Article = 'articles',
  Ephemera = 'ephemera'
}

const program = new Command();
program
  .command('new <postType> <slug>')
  .description('Create a new post with the given post type')
  .action(async (postType, slug) => {
    let postDir: string;
    const dataDir = getDataDir();
    const now = moment();
    const postData = ['---'];
    switch (postType) {
      case PostTypes.Page:
        postDir = path.join(dataDir, 'pages');
        postData.push('title: ');
        break;
      case PostTypes.Article:
        postDir = path.join(dataDir, 'articles');
        postData.push('title: ');
        postData.push('tags: ');
        break;
      case PostTypes.Ephemera:
        postDir = path.join(dataDir, 'ephemera', now.format('YYYY/MM'));
        slug = now.format('DD-hh-mm-ss');
        break;
      default:
        console.error(`Can't create posts of type '${postType}'!`);
        return;
    }
    postData.push(`published: ${moment().format()}`);
    postData.push(`updated: ${moment().format()}`);
    postData.push('---');
    postData.push('');
    await ensureDir(postDir);
    const postPath = path.join(postDir, `${slug}.md`);
    await writeFile(postPath, postData.join('\n'));
    exec(`${getDefaultEditor()} "${postPath}"`);
  });

program
  .command('migrate')
  .description('Migrates data to the latest version')
  .action(async () => {
    const tempDir = await mkTempDir();
    for (const postType of Object.values(PostTypes)) {
      const tempPostDir = path.join(tempDir, postType);
      const items = await getMarkdownItems([postType]);
      const output: JSON[] = [];
      for (const item of items) {
        if (item.fileData.data.published) {
          output.push(<JSON>(<unknown>{
            ...item.fileData.data,
            slug: item.slug,
            content: item.fileData.content,
            id: ulid(new Date(item.fileData.data.published).getTime())
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
