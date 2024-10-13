import { Attachment } from '@codec/resource';

export enum ResourceTypeName {
  Page = 'page',
  Article = 'article',
  Note = 'note'
}

interface BaseResource {
  id: string;
  created: Date;
  updated: Date;
  attachments: Attachment[];
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
export interface NoteType extends BaseResource {
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
    attachments:
      typeof json['attachments'] == 'string'
        ? (JSON.parse(json['attachments']) as Attachment[])
        : json['attachments'],
    isPublic: 'is_public' in json ? json['is_public'] : json['isPublic'],
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
    id: resource.id,
    type: resource.type,
    is_public: resource.isPublic,
    attachments: JSON.stringify(resource.attachments),
    created_date: resource.created,
    updated_date: resource.updated,
    content: JSON.stringify(resource.content)
  };
  return json;
};
