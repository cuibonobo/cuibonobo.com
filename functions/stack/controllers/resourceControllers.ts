import { Schema, validate } from 'jtd';
import { IResources, ResourceDbCreateSchema, ResourceDbUpdateSchema } from '../models/resources.js';
import type { ITypes } from '../models/types.js';

export const getResources = async (resources: IResources, url: URL): Promise<Response> => {
  const typeId = url.searchParams.get('type');
  const contentKey = url.searchParams.get('contentKey');
  const contentValue = url.searchParams.get('contentValue');
  const attachmentId = url.searchParams.get('attachmentId');
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
  resources: IResources,
  resourceId: string
): Promise<Response> => {
  const result = await resources.getOne(resourceId);
  if (result == null) {
    return Response.json({ error: 'Resource not found.' }, { status: 404 });
  }
  return Response.json(result);
};

export const postResource = async (
  resources: IResources,
  types: ITypes,
  json: Record<string, unknown>
): Promise<Response> => {
  const parseResult = ResourceDbCreateSchema.safeParse(json);
  if (!parseResult.success) {
    return Response.json(
      { error: `Validation error for resource.`, issues: parseResult.error?.issues },
      { status: 422 }
    );
  }
  const data = parseResult.data;
  const type = await types.getOne(data.type);
  if (type == null) {
    return Response.json({ error: `Type '${data.type}' does not exist.` }, { status: 422 });
  }
  const schema: Schema = JSON.parse(type.schema);
  const issues = validate(schema, data.content, { maxDepth: 32, maxErrors: 0 });
  if (issues.length !== 0) {
    return Response.json(
      { error: `Validation error for '${data.type}' content type.`, issues },
      { status: 422 }
    );
  }
  return Response.json(await resources.createOne(data));
};

export const postResourceById = async (
  resources: IResources,
  types: ITypes,
  resourceId: string,
  json: Record<string, unknown>
): Promise<Response> => {
  const parseResult = ResourceDbUpdateSchema.safeParse(json);
  if (!parseResult.success) {
    return Response.json(
      { error: 'Validation error for resource.', issues: parseResult.error.issues },
      { status: 422 }
    );
  }
  const data = parseResult.data;
  if ('id' in data && data.id!.toLowerCase() != resourceId.toLowerCase()) {
    return new Response(JSON.stringify({ message: 'Ids do not match!' }), { status: 422 });
  }
  if ('content' in data || 'type' in data) {
    const resource = await resources.getOne(resourceId);
    if (resource == null) {
      return new Response(JSON.stringify({ message: 'Resource not found.' }), { status: 404 });
    }
    if ('type' in data && !('content' in data) && resource.type !== data.type) {
      return Response.json(
        { error: 'Type may not be changed without a matching content field.' },
        { status: 422 }
      );
    }
    if ('content' in data) {
      const dataType = data.type ? data.type : resource.type;
      const type = await types.getOne(dataType);
      if (type == null) {
        return Response.json({ error: `Type '${data.type}' does not exist.` }, { status: 422 });
      }
      const schema: Schema = JSON.parse(type.schema);
      const issues = validate(schema, data.content, { maxDepth: 32, maxErrors: 0 });
      if (issues.length !== 0) {
        return Response.json(
          { error: `Validation error for '${dataType}' content type.`, issues },
          { status: 422 }
        );
      }
    }
  }
  return Response.json(await resources.updateOne(resourceId, data));
};
