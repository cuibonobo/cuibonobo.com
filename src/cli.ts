import path from 'path';
import { Command } from 'commander';
import moment from 'moment';
import { exec } from 'child_process';
import yaml from 'yaml';
import { generateId } from './lib/id';
import {
  getDataDir,
  getDefaultEditor,
  ensureDir,
  writeFile,
  getMarkdownItems,
  mkTempDir
} from './lib/fs';

enum PostTypeName {
  Page = 'page',
  Article = 'article',
  Ephemera = 'ephemera'
}

interface BasePost {
  id: string;
  published: Date;
  updated: Date;
  slug: string;
}
interface TitleMixin {
  title: string;
}
interface PageType extends BasePost, TitleMixin {
  type: PostTypeName.Page;
}
interface ArticleType extends BasePost, TitleMixin {
  type: PostTypeName.Article;
  tags: string;
}
interface EphemeraType extends BasePost {
  type: PostTypeName.Ephemera;
}

type PostType = PageType | ArticleType | EphemeraType;

const yamlDivider = '---';
const yamlPlaceholder = '.';

const getdefaultPostData = (postTypeName: PostTypeName): PostType => {
  const now = new Date();
  const postData = {
    id: generateId(now.getTime()),
    published: now,
    updated: now,
    slug: ''
  };
  switch (postTypeName) {
    case PostTypeName.Page:
      return { type: PostTypeName.Page, ...postData, title: yamlPlaceholder };
    case PostTypeName.Article:
      return {
        type: PostTypeName.Article,
        ...postData,
        title: yamlPlaceholder,
        tags: yamlPlaceholder
      };
    case PostTypeName.Ephemera:
      return { type: PostTypeName.Ephemera, ...postData };
  }
};

const program = new Command();
program
  .command('new <postType> <slug>')
  .description('Create a new post with the given post type')
  .action(async (postType, slug) => {
    if (Object.values(PostTypeName).indexOf(postType) < 0) {
      console.error(`Can't create posts of type '${postType}'!`);
      return;
    }
    let postDir: string;
    const dataDir = getDataDir();
    const postData = getdefaultPostData(postType);
    const now = moment(postData.published);
    if (postType === PostTypeName.Ephemera) {
      postDir = path.join(dataDir, 'ephemera', now.format('YYYY/MM'));
      postData.slug = now.format('DD-hh-mm-ss');
    } else {
      // FIXME: Converting the type name to plural for the directory name is hacky af
      postDir = path.join(dataDir, `${postType}s`);
      postData.slug = slug;
    }
    const yamlLines = yaml.stringify(postData).split('\n');
    const postOutput = [yamlDivider, ...yamlLines.slice(0, yamlLines.length - 1), yamlDivider, ''];
    await ensureDir(postDir);
    const postPath = path.join(postDir, `${slug}.md`);
    await writeFile(postPath, postOutput.join('\n'));
    exec(`${getDefaultEditor()} "${postPath}"`);
  });

program
  .command('migrate')
  .description('Migrates data to the latest version')
  .action(async () => {
    const tempDir = await mkTempDir();
    for (const postType of Object.values(PostTypeName)) {
      const tempPostDir = path.join(tempDir, postType);
      const items = await getMarkdownItems([postType]);
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
