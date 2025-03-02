import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { ResourceTypeName } from './lib/types';
import { MissingLockfileError } from './lib/errors';
import { openWithEditor, openWithFileExplorer } from './lib/fs';
import { getResourcesByType, deleteResource, getResource, createType } from './lib/api';
import { lockCreate, lockEdit, lockCommit, lockRead, lockDelete } from './lib/lock';
import { getFrontMatter } from './lib/resources';
import { slugger } from './lib/slugger';
import { writeSitemap } from './lib/sitemap';
import { writeFeeds } from './lib/feed';
import { writeSitePages } from './lib/site';
import { generateId } from './lib/id';
import { getTypeHash, getTypeSchema } from '../codec/type';

const MAX_TEXT_LENGTH = 100;

const program = new Command();
program
  .command('new <resourceType>')
  .description('Create a new resource with the given resource type')
  .action(async (resourceType: ResourceTypeName) => {
    if (Object.values(ResourceTypeName).indexOf(resourceType) < 0) {
      console.error(`Can't create resources of type '${resourceType}'!`);
      return;
    }
    try {
      const lockData = await lockCreate(resourceType);
      console.debug(`Created ${lockData.resourceType} resource ID ${lockData.resourceId}`);
      exec(openWithFileExplorer(path.dirname(lockData.lockedFilePath)));
      exec(openWithEditor(lockData.lockedFilePath));
    } catch (e) {
      console.error(e);
    }
  });

program
  .command('list <resourceType>')
  .description('List existing resources of the given resource type')
  .action(async (resourceType: ResourceTypeName) => {
    const resources = await getResourcesByType(resourceType);
    if (!resources.length) {
      console.error(`Couldn't find resources of type '${resourceType}'!`);
      return;
    }
    resources.forEach((resource) => {
      let text =
        resource.type === ResourceTypeName.Note ? resource.content.text : resource.content.title;
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.slice(0, MAX_TEXT_LENGTH);
        text = text.slice(0, text.lastIndexOf(' '));
      }
      console.info(`${resource.id}: ${text}`);
    });
    console.info('\n');
  });

program
  .command('read <resourceId>')
  .description('Read an existing resource that matches the given resource ID')
  .action(async (resourceId: string) => {
    try {
      const resource = await getResource(resourceId);
      const frontMatter = getFrontMatter(resource);
      console.info(frontMatter);
      console.info(resource.content.text);
    } catch (e) {
      console.error(`Couldn't read resource ID ${resourceId}: `, e);
    }
  });

program
  .command('edit <resourceId>')
  .description('Edit an existing resource that matches the given resource ID')
  .action(async (resourceId: string) => {
    try {
      const lockData = await lockEdit(resourceId);
      exec(openWithFileExplorer(path.dirname(lockData.lockedFilePath)));
      exec(openWithEditor(lockData.lockedFilePath));
    } catch (e) {
      console.error(`Couldn't edit resource ID ${resourceId}: `, e);
    }
  });

program
  .command('status')
  .description('Show the current editing state')
  .action(async () => {
    try {
      const lockData = await lockRead();
      console.info(`Currently editing ${lockData.resourceType} ID ${lockData.resourceId}.`);
      console.info(`Edit path: ${lockData.lockedFilePath}`);
    } catch (e) {
      console.info('Nothing is being edited.');
    }
  });

program
  .command('commit')
  .description('Save the resource that is being edited to the data store')
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
  .command('delete <str>')
  .description('Delete the resource with the given ID')
  .action(async (resourceId: string) => {
    try {
      await deleteResource(resourceId);
    } catch (e) {
      console.error(`Couldn't delete resource ${resourceId}: `, e);
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
  .command('init')
  .description('Initialize the database with starter types')
  .action(async () => {
    console.info('Creating note...');
    const noteContent = {
      properties: {
        text: { type: 'string' }
      }
    };
    try {
      await createType({
        name: 'note',
        singular: 'Note',
        plural: 'Notes',
        schema: getTypeSchema(noteContent),
        hash: await getTypeHash(noteContent)
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`Couldn't create note: ${err.message}`);
    }

    console.info('Creating article...');
    const articleContent = {
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        tags: { type: 'string' },
        text: { type: 'string' }
      }
    };
    try {
      await createType({
        name: 'article',
        singular: 'Article',
        plural: 'Articles',
        schema: getTypeSchema(articleContent),
        hash: await getTypeHash(articleContent)
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`Couldn't create article: ${err.message}`);
    }

    console.info('Creating page...');
    const pageContent = {
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        text: { type: 'string' }
      }
    };
    try {
      await createType({
        name: 'page',
        singular: 'Page',
        plural: 'Pages',
        schema: getTypeSchema(pageContent),
        hash: await getTypeHash(pageContent)
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`Couldn't create page: ${err.message}`);
    }
  });

program
  .command('id')
  .description('Generate a new resource ID')
  .action(() => {
    console.info(generateId());
  });

program
  .command('slugify <str>')
  .description('Convert the given string to a slug')
  .action((str: string) => {
    console.info(slugger(str));
  });

program
  .command('sitemap <origin>')
  .description('Build a sitemap for all resources')
  .action(async (origin: string) => {
    await writeSitemap(origin);
  });

program
  .command('feed <origin>')
  .description('Build the syndication feeds for all resources')
  .action(async (origin: string) => {
    await writeFeeds(origin);
  });

program
  .command('site')
  .description('Build the site HTML')
  .action(async () => {
    await writeSitePages('./build');
  });

program.parse();
