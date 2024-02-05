export enum PostTypeName {
  Page = 'page',
  Article = 'article',
  Ephemera = 'ephemera'
}

interface BasePost {
  id: string;
  created: Date;
  updated: Date;
  isPublic?: boolean;
}
export interface PageType extends BasePost {
  type: PostTypeName.Page;
  content: {
    title: string;
    slug: string | number;
    text: string;
  };
}
export interface ArticleType extends BasePost {
  type: PostTypeName.Article;
  content: {
    title: string;
    tags: string;
    slug: string;
    text: string;
  };
}
export interface EphemeraType extends BasePost {
  type: PostTypeName.Ephemera;
  content: {
    text: string;
  };
}

export type PostType<T> = T extends PostTypeName.Page
  ? PageType
  : T extends PostTypeName.Article
    ? ArticleType
    : T extends PostTypeName.Ephemera
      ? EphemeraType
      : never;

interface ContentKeyItem {
  id: string;
  key: string;
}

export type SlugData = ContentKeyItem[];
export type QueryData<T> = PostType<T>[];

export const jsonToPostType = <T>(json: unknown): PostType<T> => {
  const post = json as any;
  if ('created_date' in post) {
    post.created = new Date(post.created_date);
    post.updated = new Date(post.updated_date);
    delete post.updated_date;
    delete post.created_date;
  } else {
    post.created = new Date(post.created);
    post.updated = new Date(post.updated);
  }
  if ('is_public' in post) {
    post.isPublic = post.is_public ? true : false;
    delete post.is_public;
  } else {
    post.isPublic = post.isPublic ? true : false;
  }
  if (typeof('content') == 'string') {
    post.content = JSON.parse(post.content);
  }
  return post as PostType<T>;
};
