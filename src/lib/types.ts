import { Attachment } from '@codec/attachment';

export enum ResourceTypeName {
  Page = 'page',
  Article = 'article',
  Note = 'note'
}

export interface ResourceBase {
  id: string;
  created_date: Date;
  updated_date: Date;
  attachments: Attachment[];
  is_public?: boolean;
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
    slug: string;
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

export const jsonToResourceType = <T>(json: JSONObject): ResourceType<T> => {
  const resource = {
    ...json,
    created_date: new Date(json['created_date'] as string),
    updated_date: new Date(json['updated_date'] as string),
    attachments:
      typeof json['attachments'] == 'string'
        ? (JSON.parse(json['attachments']) as Attachment[])
        : json['attachments'],
    content:
      typeof json['content'] == 'string'
        ? (JSON.parse(json['content']) as JSONObject)
        : json['content']
  };
  return resource as ResourceType<T>;
};

export const resourceTypeToJson = <T extends ResourceTypeName>(
  resource: ResourceType<T>
): JSONObject => {
  const json: JSONObject = {
    ...resource,
    attachments: JSON.stringify(resource.attachments),
    content: JSON.stringify(resource.content)
  };
  return json;
};
