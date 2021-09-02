import path from 'path';
import fs from 'fs';
import util from 'util';
import process from 'process';
import { Command } from 'commander';
import moment from 'moment';
import { exec } from 'child_process';

const dataDir = path.resolve('data');
const writeFile = util.promisify(fs.writeFile);
const mkDir = util.promisify(
  (
    path: string,
    options: fs.MakeDirectoryOptions = {},
    callback: (err: NodeJS.ErrnoException, path?: string) => void
  ) => {
    options.recursive = true;
    return fs.mkdir(path, options, callback);
  }
);
const lstat = util.promisify(fs.lstat);

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

const ensureDir = async (path: string) => {
  try {
    const f = await lstat(path);
    if (f.isFile()) {
      await mkDir(path, { recursive: true });
    }
  } catch (e) {
    if (e.code == 'ENOENT') {
      await mkDir(path, { recursive: true });
      return;
    }
    throw e;
  }
};

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
        postDir = path.join(dataDir, 'pages');
        postData.push('title: ');
        break;
      case 'article':
        postDir = path.join(dataDir, 'articles');
        postData.push('title: ');
        postData.push('tags: ');
        break;
      case 'ephemera':
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

program.parse();
