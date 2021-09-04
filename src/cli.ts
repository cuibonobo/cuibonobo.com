import path from 'path';
import { Command } from 'commander';
import moment from 'moment';
import { exec } from 'child_process';
import { getDataDir, getDefaultEditor, ensureDir, writeFile } from './lib/fs';

const program = new Command();
program
  .command('new <postType> <slug>')
  .description('Create a new post with the given post type')
  .action(async (postType, slug) => {
    let postDir: string;
    const now = moment();
    const postData = ['---'];
    switch (postType) {
      case 'page':
        postDir = path.join(getDataDir(), 'pages');
        postData.push('title: ');
        break;
      case 'article':
        postDir = path.join(getDataDir(), 'articles');
        postData.push('title: ');
        postData.push('tags: ');
        break;
      case 'ephemera':
        postDir = path.join(getDataDir(), 'ephemera', now.format('YYYY/MM'));
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

program.parse();
