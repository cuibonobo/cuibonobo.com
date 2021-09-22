import path from 'path';
import { exec } from 'child_process';
import { Command } from 'commander';
import { PostTypeName } from './lib/types';
import {
  createPost,
  checkoutPost,
  editPost,
  commitPost,
  getPostsByType,
  readLockFile,
  deleteLockFile,
  openWithEditor,
  openWithFileExplorer,
  buildIndices
} from './lib/fs';

const program = new Command();
program
  .command('new <postType>')
  .description('Create a new post with the given post type')
  .action(async (postType) => {
    if (Object.values(PostTypeName).indexOf(postType) < 0) {
      console.error(`Can't create posts of type '${postType}'!`);
      return;
    }
    try {
      const post = await createPost(postType);
      console.debug(`Created ${post.type} post ID ${post.id}`);
      const editorPath = await checkoutPost(post);
      exec(openWithFileExplorer(path.dirname(editorPath)));
      exec(openWithEditor(editorPath));
    } catch (e) {
      console.error(e);
    }
  });

program
  .command('list <post')
  .description('Lists the posts of the given post type')
  .action(async (postType) => {
    const posts = await getPostsByType(postType);
    posts.forEach((post) => {
      console.info(
        `${post.id}: ${
          post.type === PostTypeName.Ephemera ? post.content.text : post.content.title
        }`
      );
    });
    console.info('\n');
  });

const editCommit = async () => {
  try {
    await commitPost();
  } catch (e) {
    console.error("Couldn't commit", e);
  }
};

const editDiscard = async () => {
  try {
    await deleteLockFile();
    console.info('Cleared existing editing state');
  } catch (e) {
    console.info('Editing state was already clear');
  }
};

const editStatus = async () => {
  try {
    const lockData = await readLockFile();
    console.info(`Currently editing ${lockData.postType} ID ${lockData.postId}.`);
    console.info(`Edit path: ${lockData.lockedFilePath}`);
  } catch (e) {
    console.info('Nothing is currently being edited.');
  }
};

const editHelp = () => {
  console.info('edit sub-commands: ');
  console.info('    <postType> <postId>     Edits the post with the given post type and ID');
  console.info('    status                  Shows whether a post is currently being edited');
  console.info('    commit                  Saves the post that is being edited to the data store');
  console.info('    discard                 Discard the edits currently in progress');
  console.info('    help                    Shows this help text');
  console.info('');
};

const editCommands = {
  commit: editCommit,
  discard: editDiscard,
  status: editStatus,
  help: editHelp
};

program
  .command('edit <command|postType> [postId]')
  .description('Edit existing posts of a given post type')
  .action(async (command, postId) => {
    if (command in editCommands) {
      return editCommands[command]();
    }
    const postType = command;
    if (!Object.values(PostTypeName).includes(postType)) {
      console.error(`'${postType}' is not an existing post type or command`);
      return editHelp();
    }
    if (!postId) {
      console.error('A post ID must be supplied to edit a post!');
      return editHelp();
    }
    try {
      const editorPath = await editPost(postId, postType);
      exec(openWithFileExplorer(path.dirname(editorPath)));
      exec(openWithEditor(editorPath));
    } catch (e) {
      console.error(`Couldn't edit ${postType} post ID ${postId}`, e);
    }
  });

program
  .command('index')
  .description('Builds indices for the post types in the data store')
  .action(async () => {
    await buildIndices();
  });

program.parse();
