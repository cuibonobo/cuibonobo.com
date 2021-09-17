export enum PostTypeName {
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
export interface PageType extends BasePost, TitleMixin {
  type: PostTypeName.Page;
}
export interface ArticleType extends BasePost, TitleMixin {
  type: PostTypeName.Article;
  tags: string;
}
export interface EphemeraType extends BasePost {
  type: PostTypeName.Ephemera;
}

export type PostType = PageType | ArticleType | EphemeraType;
