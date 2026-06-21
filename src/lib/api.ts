import { ResourceTypeName, ResourceType } from './types';
import { Attachment } from '@codec/attachment';
import * as errors from './errors';
import { getAuthHeaders } from './auth';

// ---------------------------------------------------------------------------
// Wire types (haverstack server format)
// ---------------------------------------------------------------------------

interface WireRecord {
  id: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  content: Record<string, unknown>;
  version: number;
  parentId?: string;
  entityId?: string;
  appId?: string;
  deletedAt?: string;
  permissions?: unknown[];
  associations?: unknown[];
}

interface WireListResult {
  records: WireRecord[];
  cursor?: string;
  total: number;
}

export interface WireType {
  id: string;
  baseId: string;
  version: number;
  name: string;
  schema: Record<string, unknown>;
  schemaHash: string;
  migratesFrom?: string;
  createdAt: string;
}

export interface TypeCreate {
  id: string;
  baseId: string;
  version: number;
  name: string;
  schema: Record<string, unknown>;
  schemaHash: string;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.STACK_SERVER_URL ?? 'http://127.0.0.1:3000';
};

const getUrl = (path: string): string => `${getBaseUrl()}/${path}`;

export const toTypeId = (type: ResourceTypeName): string => `${type}@1`;

const CONTENT_TYPE_BASES = new Set<string>(Object.values(ResourceTypeName));

// ---------------------------------------------------------------------------
// Wire → app model
// ---------------------------------------------------------------------------

const wireToResource = <T extends ResourceTypeName>(wire: WireRecord): ResourceType<T> => {
  const rawContent = wire.content;
  const attachments: Attachment[] = Array.isArray(rawContent.attachments)
    ? (rawContent.attachments as Attachment[])
    : [];
  // Strip the stored attachments array so typed content fields are clean
  const { attachments: _a, ...content } = rawContent;
  return {
    id: wire.id,
    type: wire.typeId.split('@')[0] as ResourceTypeName,
    createdAt: new Date(wire.createdAt),
    updatedAt: new Date(wire.updatedAt),
    attachments,
    content
  } as unknown as ResourceType<T>;
};

// Merge typed content with attachments array for API writes
const toWireContent = <T extends ResourceTypeName>(
  resource: ResourceType<T>
): Record<string, unknown> => ({
  ...resource.content,
  attachments: resource.attachments
});

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const throwOnError = async (response: Response): Promise<void> => {
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`Error at '${response.url}': ${await response.text()}`);
  }
};

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: getAuthHeaders() });
  await throwOnError(response);
  return response.json() as Promise<T>;
};

const postJson = async <T>(url: string, data: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }
  });
  await throwOnError(response);
  return response.json() as Promise<T>;
};

const patchJson = async <T>(url: string, data: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }
  });
  await throwOnError(response);
  return response.json() as Promise<T>;
};

const deleteReq = async (url: string): Promise<void> => {
  const response = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
  await throwOnError(response);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getAllResources = async <T extends ResourceTypeName>(): Promise<ResourceType<T>[]> => {
  const result = await getJson<WireListResult>(getUrl('records'));
  return result.records
    .filter((r) => CONTENT_TYPE_BASES.has(r.typeId.split('@')[0]))
    .map((r) => wireToResource<T>(r));
};

export const getResource = async <T extends ResourceTypeName>(
  resourceId: string
): Promise<ResourceType<T>> => {
  const wire = await getJson<WireRecord>(getUrl(`records/${resourceId}`));
  return wireToResource<T>(wire);
};

export const getResourceBySlug = async <T extends ResourceTypeName>(
  slug: string,
  resourceType: T
): Promise<ResourceType<T>> => {
  if (resourceType === ResourceTypeName.Note) {
    throw new errors.ResourceTypeError('Notes do not have slugs!');
  }
  const result = await postJson<WireListResult>(getUrl('records/query'), {
    filter: { typeId: toTypeId(resourceType), content: { slug } }
  });
  if (!result.records.length) {
    throw new errors.ResourceNotFoundError(
      `No ${resourceType} resources contain slug '${slug}'!`
    );
  }
  return wireToResource<T>(result.records[0]);
};

export const getResourcesByType = async <T extends ResourceTypeName>(
  resourceType: T
): Promise<ResourceType<T>[]> => {
  const result = await getJson<WireListResult>(
    getUrl(`records?typeId=${encodeURIComponent(toTypeId(resourceType))}`)
  );
  return result.records.map((r) => wireToResource<T>(r));
};

export const createResource = async <T extends ResourceTypeName>(
  resource: ResourceType<T>
): Promise<ResourceType<T>> => {
  const created = await postJson<WireRecord>(getUrl('records'), {
    typeId: toTypeId(resource.type),
    content: toWireContent(resource),
    permissions: [{ access: 'public' }]
  });
  return wireToResource<T>(created);
};

export const updateResource = async <T extends ResourceTypeName>(
  resourceId: string,
  resource: ResourceType<T>
): Promise<ResourceType<T>> => {
  const updated = await patchJson<WireRecord>(getUrl(`records/${resourceId}`), {
    content: toWireContent(resource)
  });
  return wireToResource<T>(updated);
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  await deleteReq(getUrl(`records/${resourceId}`));
};

export const getAllTypes = async (): Promise<WireType[]> => {
  return getJson<WireType[]>(getUrl('types'));
};

export const createType = async (data: TypeCreate): Promise<WireType> => {
  return postJson<WireType>(getUrl('types'), data);
};
