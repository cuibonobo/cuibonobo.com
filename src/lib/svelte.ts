import type { ErrorLoadInput, Load, LoadInput, LoadOutput } from '@sveltejs/kit';
import { getPostBySlug, getPostById, getPostsByType } from '@lib/fs';
import { PostTypeName } from '@lib/types';
import { PostNotFoundError } from '@lib/errors';

const slugFromPath = (path: string): string => {
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const pathParts = path.split('/');
  const slug = pathParts[pathParts.length - 1];
  return slug ? slug : 'index';
};

const loadOr404: (l: Load, i: LoadInput) => Promise<void | LoadOutput> = async (
  loader: Load,
  input: LoadInput
) => {
  try {
    return await loader(input);
  } catch (e: unknown) {
    if (e instanceof PostNotFoundError) {
      return {
        status: 404,
        error: `Not found: ${input.page.path}`
      };
    }
    throw e;
  }
};

export const loadError: (loadOutput: ErrorLoadInput) => LoadOutput = ({ error, status }) => {
  if (error === undefined) {
    error = new Error('Error');
  }
  if (status === undefined) {
    status = 500;
  }
  return {
    props: {
      status,
      message: error.message
    }
  };
};

export const loadPage: Load = async (input: LoadInput) => {
  return loadOr404(async ({ page }) => {
    const { path } = page;
    const slug = slugFromPath(path);
    const post = await getPostBySlug(slug, PostTypeName.Page);
    return {
      props: {
        title: <string>post.content['title'],
        text: post.content['text']
      }
    };
  }, input);
};

export const loadArticles: Load = async (input: LoadInput) => {
  return loadOr404(async () => {
    const posts = await getPostsByType(PostTypeName.Article);
    return {
      props: {
        items: posts.map((post) => {
          return {
            slug: <string>post.content['slug'],
            title: <string>post.content['title'],
            created: post.created,
            tags: <string>post.content['tags'],
            text: post.content.text
          };
        })
      }
    };
  }, input);
};

export const loadArticle: Load = async (input: LoadInput) => {
  return loadOr404(async ({ page }) => {
    const { path } = page;
    const slug = slugFromPath(path);
    const post = await getPostBySlug(slug, PostTypeName.Article);
    return {
      props: {
        title: <string>post.content['title'],
        created: post.created,
        updated: post.updated,
        tags: <string>post.content['tags'],
        text: post.content.text
      }
    };
  }, input);
};

export const loadEphemera: Load = async (input: LoadInput) => {
  return loadOr404(async () => {
    const posts = await getPostsByType(PostTypeName.Ephemera);
    return {
      props: {
        items: posts.map((post) => {
          return {
            id: post.id,
            created: post.created,
            text: post.content.text
          };
        })
      }
    };
  }, input);
};

export const loadEphemeron: Load = async (input: LoadInput) => {
  return loadOr404(async ({ page }) => {
    const { path } = page;
    const slug = slugFromPath(path);
    const post = await getPostById(slug);
    return {
      props: {
        id: post.id,
        created: post.created,
        updated: post.updated,
        text: post.content.text
      }
    };
  }, input);
};
