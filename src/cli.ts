import path from 'path';
import fs from 'fs';
import util from 'util';
import process from 'process';
import { Command } from 'commander';
import moment from 'moment';
import { exec } from 'child_process';

const dataDir = path.resolve('data');
const writeFile = util.promisify(fs.writeFile);

const getDefaultEditor = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'start ""';
    case 'darwin':
      return 'open';
    default:
      return '${VISUAL-${EDITOR-nano}}';
  }
};

const program = new Command();
program
  .command('new <postType> <slug>')
  .description('Create a new post with the given post type')
  .action(async (postType, slug) => {
    let postDir: string;
    const postData = ['---'];
    switch (postType) {
      case 'page':
        postDir = path.join(dataDir, 'pages');
        postData.push('title: ');
        break;
      case 'article':
        postDir = path.join(dataDir, 'articles');
        postData.push('title: ');
        postData.push('tags: ');
        break;
      case 'ephemera':
        postDir = path.join(dataDir, 'ephemera');
        slug = moment().format('YYYY/MM/DD-hh-mm-ss');
        break;
      default:
        console.error(`Can't create posts of type '${postType}'!`);
        return;
    }
    postData.push(`published: ${moment().format()}`);
    postData.push(`updated: ${moment().format()}`);
    postData.push('---');
    postData.push('');
    const postPath = path.join(postDir, `${slug}.md`);
    await writeFile(postPath, postData.join('\n'));
    exec(`${getDefaultEditor()} "${postPath}"`);
  });

program.parse();
