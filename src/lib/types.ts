export enum PostTypeName {
  Page = 'page',
  Article = 'article',
  Ephemera = 'ephemera'
}

interface BasePost {
  id: string;
  created: Date;
  updated: Date;
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

export interface SlugData {
  [slug: string]: string;
}

export interface IndexData<T> {
  posts: PostType<T>[];
}

export const jsonToPostType = <T>(json: unknown): PostType<T> => {
  const post = json as PostType<T>;
  post.created = new Date(post.created);
  post.updated = new Date(post.updated);
  return post;
};
