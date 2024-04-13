import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { ResourceTypeName } from './lib/types';
import { MissingLockfileError } from './lib/errors';
import { openWithEditor, openWithFileExplorer } from './lib/fs';
import { deleteResource, getAllResources } from './lib/resources';
import { getResourcesByType } from './lib/api';
import { lockCreate, lockEdit, lockCommit, lockRead, lockDelete } from './lib/lock';
import { slugger } from './lib/slugger';
import { writeSitemap } from './lib/sitemap';
import { writeFeeds } from './lib/feed';
import { writeSitePages } from './lib/site';
import { generateId } from './lib/id';

const stackUrl = 'http://127.0.0.1:8788';

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
    resources.forEach((resource) => {
      console.info(
        `${resource.id}: ${
          resource.type === ResourceTypeName.Ephemera
            ? resource.content.text
            : resource.content.title
        }`
      );
    });
    console.info('\n');
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

program
  .command('create <resourceType>')
  .description('Create a resource with the new API')
  .action(async (resourceType: string) => {
    const data = {
      id: generateId(),
      type: resourceType,
      content: { text: 'Generated from CLI' }
    };
    const url = new URL('/stack/resources', stackUrl);
    const result = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
      body: JSON.stringify(data)
    });
    console.log(result.statusText);
  });

program
  .command('update <id> <data>')
  .description('Update a resource with the new API')
  .action(async (id: string, data: string) => {
    const url = new URL('/stack/resources/' + id, stackUrl);
    const result = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
      body: data
    });
    console.log(result.statusText);
  });

program
  .command('remove <id>')
  .description('Remove a resource with the new API')
  .action(async (id: string) => {
    const url = new URL('/stack/resources/' + id, stackUrl);
    const result = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      method: 'delete'
    });
    console.log(result.statusText);
  });

program
  .command('seed')
  .description('Seed database with resources from file repo')
  .action(async () => {
    const resources = await getAllResources();
    resources.forEach((resource) => {
      void (async (resource) => {
        resource.isPublic = true;
        const data = {
          id: resource.id,
          type: resource.type,
          is_public: resource.isPublic ? 1 : 0,
          created_date: resource.created,
          updated_date: resource.updated,
          content: resource.content
        };
        const url = new URL('/stack/resources', stackUrl);
        const result = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          method: 'post',
          body: JSON.stringify(data)
        });
        console.log(result.statusText);
      })(resource);
    });
  });

program.parse();
