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

export type JSONValue = string | number | boolean | null | JSONValue[] | {[key: string]: JSONValue};

export interface JSONObject {
  [k: string]: JSONValue
}

export interface JSONArray extends Array<JSONValue> {}

export const jsonToPostType = <T>(json: JSONObject): PostType<T> => {
  const post = {
    id: json['id'],
    type: json['type'],
    created: 'created_date' in json ? new Date(json['created_date'] as string) : new Date(json['created'] as string),
    updated: 'updated_date' in json ? new Date(json['updated_date'] as string) : new Date(json['updated'] as string),
    isPublic: 'is_public' in json ? json['is_public'] : json['isPublic'],
    content: typeof json['content'] == 'string' ? JSON.parse(json['content'] ) as JSONObject : json['content']
  };
  return post as PostType<T>;
};
