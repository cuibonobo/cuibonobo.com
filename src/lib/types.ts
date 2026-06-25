import type { Association } from '@haverstack/core';

export enum ResourceTypeName {
  Page = 'page',
  Article = 'article',
  Note = 'note'
}

export interface ResourceBase {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  associations: Association[];
  parentId?: string;
}
export interface PageType extends ResourceBase {
  type: ResourceTypeName.Page;
  content: {
    title: string;
    slug: string;
    text: string;
  };
}
export interface ArticleType extends ResourceBase {
  type: ResourceTypeName.Article;
  content: {
    title: string;
    tags: string;
    text: string;
  };
}
export interface NoteType extends ResourceBase {
  type: ResourceTypeName.Note;
  content: {
    text: string;
  };
}

export type ResourceType<T> = T extends ResourceTypeName.Page
  ? PageType
  : T extends ResourceTypeName.Article
    ? ArticleType
    : T extends ResourceTypeName.Note
      ? NoteType
      : never;

// Site generator system type — not a user content resource
export interface PageMetaType {
  id: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  content: {
    slug: string;
    publishedAt?: string;
    summary?: string;
  };
}

interface ContentKeyItem {
  id: string;
  key: string;
}

export type SlugData = ContentKeyItem[];

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Date
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface JSONObject {
  [k: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

