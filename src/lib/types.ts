export enum ResourceTypeName {
  Page = 'page',
  Article = 'article',
  Ephemera = 'ephemera'
}

interface BaseResource {
  id: string;
  created: Date;
  updated: Date;
  isPublic?: boolean;
}
export interface PageType extends BaseResource {
  type: ResourceTypeName.Page;
  content: {
    title: string;
    slug: string | number;
    text: string;
  };
}
export interface ArticleType extends BaseResource {
  type: ResourceTypeName.Article;
  content: {
    title: string;
    tags: string;
    slug: string;
    text: string;
  };
}
export interface EphemeraType extends BaseResource {
  type: ResourceTypeName.Ephemera;
  content: {
    text: string;
  };
}

export type ResourceType<T> = T extends ResourceTypeName.Page
  ? PageType
  : T extends ResourceTypeName.Article
    ? ArticleType
    : T extends ResourceTypeName.Ephemera
      ? EphemeraType
      : never;

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
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface JSONObject {
  [k: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

export const jsonToResourceType = <T>(json: JSONObject): ResourceType<T> => {
  const resource = {
    id: json['id'],
    type: json['type'],
    created:
      'created_date' in json
        ? new Date(json['created_date'] as string)
        : new Date(json['created'] as string),
    updated:
      'updated_date' in json
        ? new Date(json['updated_date'] as string)
        : new Date(json['updated'] as string),
    isPublic: 'is_public' in json ? json['is_public'] : json['isPublic'],
    content:
      typeof json['content'] == 'string'
        ? (JSON.parse(json['content']) as JSONObject)
        : json['content']
  };
  return resource as ResourceType<T>;
};
