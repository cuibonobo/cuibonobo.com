import { Resources } from '../models/index.js';
import type { ResourceDbInput } from '@codec/resource.js';

export const getResources = async (resources: Resources, url: URL): Promise<Response> => {
  const typeId = url.searchParams.get('type');
  const contentKey = url.searchParams.get('contentKey');
  const contentValue = url.searchParams.get('contentValue');
  const attachmentId = url.searchParams.get('attachmentId');
  console.log(url.searchParams);
  if (contentValue && contentKey && typeId) {
    return Response.json(await resources.getByContentKey(typeId, contentKey, contentValue));
  }
  if (contentKey && typeId) {
    return Response.json(await resources.getContentKey(typeId, contentKey));
  }
  if (attachmentId) {
    return Response.json(await resources.getByAttachmentId(attachmentId));
  }
  if (typeId) {
    return Response.json(await resources.getAllByType(typeId));
  }
  return Response.json(await resources.getAll());
};

export const getResourceById = async (
  resources: Resources,
  resourceId: string
): Promise<Response> => {
  const result = await resources.getOne(resourceId);
  if (result == null) {
    return Response.json({}, { status: 404 });
  }
  return Response.json(result);
};

export const postResource = async (
  resources: Resources,
  data: ResourceDbInput
): Promise<Response> => {
  return Response.json(await resources.createOne(data));
};

export const postResourceById = async (
  resources: Resources,
  resourceId: string,
  data: Record<string, string>
): Promise<Response> => {
  if ('id' in data && data['id'].toLowerCase() != resourceId.toLowerCase()) {
    return new Response(JSON.stringify({ message: 'Ids do not match!' }), { status: 422 });
  }
  return Response.json(await resources.updateOne(resourceId, data));
};
