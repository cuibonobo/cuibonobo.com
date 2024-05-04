import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { ResourceTypeName, resourceTypeToJson } from './lib/types';
import { MissingLockfileError } from './lib/errors';
import { fileExists, openWithEditor, openWithFileExplorer } from './lib/fs';
import {
  getResourcesByType,
  deleteResource,
  getResource,
  getAllResources,
  updateResource
} from './lib/api';
import { lockCreate, lockEdit, lockCommit, lockRead, lockDelete } from './lib/lock';
import { getFrontMatter } from './lib/resources';
import { slugger } from './lib/slugger';
import { writeSitemap } from './lib/sitemap';
import { writeFeeds } from './lib/feed';
import { writeSitePages } from './lib/site';
import { generateId } from './lib/id';
import { getAbsoluteMediaLinks, escapeRegExp } from './lib/parser';
import { uploadFile } from './lib/media';

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
  .command('attachments')
  .description('Populate the attachments column')
  .action(async () => {
    const resources = await getAllResources();
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const absLinks = getAbsoluteMediaLinks(resource.content.text);
      for (let j = 0; j < absLinks.length; j++) {
        const link = absLinks[j];
        if (link.startsWith('/media')) {
          const replaced = link.replace('/media/', '/media_old/');
          const sourcePath = path.resolve(path.join('./static', replaced.substring(1)));
          if (await fileExists(sourcePath)) {
            const bucketFile = await uploadFile(sourcePath);
            if (!resource.attachments.find((a) => a.id == bucketFile.hash)) {
              resource.attachments.push({
                id: bucketFile.hash,
                name: bucketFile.name,
                tag: 'content:text'
              });
            }
          }
        }
      }
      if (resource.attachments.length) {
        const relLinks = absLinks.map((l) => path.basename(l));
        let output = resource.content.text;
        for (let k = 0; k < absLinks.length; k++) {
          const linkRegex = new RegExp(
            '(\\(|"|\')(' + escapeRegExp(absLinks[k]) + ')(\\)|"|\'|\\\\\'|\\\\")',
            'g'
          );
          output = output.replace(linkRegex, '$1' + relLinks[k] + '$3');
        }
        if (output !== resource.content.text) {
          resource.content.text = output;
          await updateResource(resource.id, resourceTypeToJson(resource));
          console.log(`uploaded to ${resource.id}`);
        }
      }
    }
  });

program.parse();
