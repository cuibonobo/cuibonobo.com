import dotenv from 'dotenv';
import { APIAdapter } from '@haverstack/adapter-api';
import { Stack, hashSchema as _hashSchema } from '@haverstack/core';
import type { StackRecord, StackType, TypeSchema } from '@haverstack/core';
import { ResourceTypeName, ResourceType, PageMetaType } from './types';
import { generateId } from './id';
import * as errors from './errors';

dotenv.config();

export type { WireType } from '@haverstack/wire-types';

// ---------------------------------------------------------------------------
// Adapter + Stack singletons
// ---------------------------------------------------------------------------

let _adapter: APIAdapter | null = null;
let _stack: Stack | null = null;

const getAdapter = async (): Promise<APIAdapter> => {
  if (!_adapter) {
    _adapter = await APIAdapter.open({
      url: process.env.STACK_SERVER_URL ?? 'http://127.0.0.1:3000',
      token: process.env.API_TOKEN
    });
  }
  return _adapter;
};

export const getStack = async (): Promise<Stack> => {
  if (!_stack) {
    _stack = await Stack.create(await getAdapter());
  }
  return _stack;
};

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

export const toTypeId = (type: ResourceTypeName): string => `${type}@1`;

const CONTENT_TYPE_BASES = new Set<string>(Object.values(ResourceTypeName));
const PAGE_META_TYPE_ID = 'site.gen/page-meta@1';

// ---------------------------------------------------------------------------
// Model converters
// ---------------------------------------------------------------------------

const stackToResource = <T extends ResourceTypeName>(record: StackRecord): ResourceType<T> => {
  return {
    id: record.id,
    type: record.typeId.split('@')[0] as ResourceTypeName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    associations: record.associations ?? [],
    parentId: record.parentId,
    content: record.content
  } as unknown as ResourceType<T>;
};

const stackToPageMeta = (record: StackRecord): PageMetaType => ({
  id: record.id,
  parentId: record.parentId,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  content: record.content as PageMetaType['content']
});

// ---------------------------------------------------------------------------
// Content resource CRUD
// ---------------------------------------------------------------------------

export const getAllResources = async <T extends ResourceTypeName>(): Promise<ResourceType<T>[]> => {
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({});
  return result.records
    .filter((r) => CONTENT_TYPE_BASES.has(r.typeId.split('@')[0]))
    .map((r) => stackToResource<T>(r));
};

export const getResource = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  const adapter = await getAdapter();
  const record = await adapter.getRecord(resourceId);
  if (!record) throw new errors.ResourceNotFoundError(`Record '${resourceId}' not found`);
  return stackToResource<T>(record);
};

export const getResourceBySlug = async <T extends ResourceTypeName>(
  slug: string,
  resourceType: T
): Promise<ResourceType<T>> => {
  if (resourceType === ResourceTypeName.Note) {
    throw new errors.ResourceTypeError('Notes do not have slugs!');
  }
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({
    filter: { typeId: toTypeId(resourceType), content: { slug } }
  });
  if (!result.records.length) {
    throw new errors.ResourceNotFoundError(
      `No ${resourceType} resources contain slug '${slug}'!`
    );
  }
  return stackToResource<T>(result.records[0]);
};

export const getResourcesByType = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<ResourceType<T>[]> => {
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({
    filter: { typeId: toTypeId(resourceType) }
  });
  return result.records.map((r) => stackToResource<T>(r));
};

export const createResource = async <T extends ResourceTypeName>(
  resource: ResourceType<T>
): Promise<ResourceType<T>> => {
  const adapter = await getAdapter();
  const record: StackRecord = {
    id: resource.id,
    typeId: toTypeId(resource.type),
    content: resource.content,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    version: 1,
    parentId: resource.parentId,
    permissions: [{ access: 'public' }]
  };
  const created = await adapter.createRecord(record);
  return stackToResource<T>(created);
};

export const updateResource = async <T extends ResourceTypeName>(
  resourceId: string,
  resource: ResourceType<T>
): Promise<ResourceType<T>> => {
  const adapter = await getAdapter();
  const updated = await adapter.updateRecord(resourceId, { content: resource.content });
  return stackToResource<T>(updated);
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  const adapter = await getAdapter();
  await adapter.deleteRecord(resourceId);
};

// ---------------------------------------------------------------------------
// Page-meta (site.gen/page-meta@1)
// ---------------------------------------------------------------------------

export const getPageMetaForRecord = async (parentId: string): Promise<PageMetaType | null> => {
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({
    filter: { typeId: PAGE_META_TYPE_ID, parentId }
  });
  if (!result.records.length) return null;
  return stackToPageMeta(result.records[0]);
};

export const getPageMetaBySlug = async (slug: string): Promise<PageMetaType | null> => {
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({
    filter: { typeId: PAGE_META_TYPE_ID, content: { slug } }
  });
  if (!result.records.length) return null;
  return stackToPageMeta(result.records[0]);
};

export const getAllPageMeta = async (): Promise<PageMetaType[]> => {
  const adapter = await getAdapter();
  const result = await adapter.queryRecords({
    filter: { typeId: PAGE_META_TYPE_ID }
  });
  return result.records.map(stackToPageMeta);
};

export const createPageMeta = async (parentId: string, slug: string): Promise<PageMetaType> => {
  const adapter = await getAdapter();
  const now = new Date();
  const record: StackRecord = {
    id: generateId(now.getTime()),
    typeId: PAGE_META_TYPE_ID,
    parentId,
    content: { slug },
    createdAt: now,
    updatedAt: now,
    version: 1,
    permissions: [{ access: 'public' }]
  };
  const created = await adapter.createRecord(record);
  return stackToPageMeta(created);
};

export const updatePageMeta = async (metaId: string, slug: string): Promise<PageMetaType> => {
  const adapter = await getAdapter();
  const updated = await adapter.updateRecord(metaId, { content: { slug } });
  return stackToPageMeta(updated);
};

export const buildPageMetaMap = async (): Promise<Map<string, PageMetaType>> => {
  const allMeta = await getAllPageMeta();
  const map = new Map<string, PageMetaType>();
  for (const meta of allMeta) {
    if (meta.parentId) map.set(meta.parentId, meta);
  }
  return map;
};

// ---------------------------------------------------------------------------
// Type registry
// ---------------------------------------------------------------------------

export interface TypeCreate {
  id: string;
  baseId: string;
  version: number;
  name: string;
  schema: Record<string, unknown>;
  schemaHash: string;
}

export const getAllTypes = async (): Promise<StackType[]> => {
  const adapter = await getAdapter();
  return adapter.listTypes();
};

export const hashSchema = (schema: Record<string, unknown>): Promise<string> =>
  _hashSchema(schema as TypeSchema);

export const createType = async (data: TypeCreate): Promise<void> => {
  const adapter = await getAdapter();
  const type: StackType = {
    ...data,
    schema: data.schema as TypeSchema,
    createdAt: new Date()
  };
  await adapter.saveType(type);
};
