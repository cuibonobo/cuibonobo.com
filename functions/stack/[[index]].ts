import { Resources } from './models.js';
import type { ResourceDbInput } from '@codec/resource.js';
import { isAuthConfigured, isValidAuth } from '../auth.js';
import { getNormalizedPath, getMethodNotAllowedResponse } from '../util.js';
import type { Context } from '../util.js';

interface Env {
  STACK_DB: D1Database;
  API_TOKEN: string;
}

const BASE_PATH = '/stack';

const rejectInvalidConfig = (context: Context<Env>): Response | null => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  if (!isAuthConfigured(context)) {
    return new Response(JSON.stringify({ message: 'API token not set!' }), { status: 500 });
  }
  if (!isValidAuth(context)) {
    return new Response(JSON.stringify({ message: 'Forbidden.' }), { status: 400 });
  }
  return null;
};

const getResource = async (resources: Resources, url: URL): Promise<Response> => {
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

const getResourceById = async (resources: Resources, resourceId: string): Promise<Response> => {
  const result = await resources.getOne(resourceId);
  if (result == null) {
    return Response.json({}, { status: 404 });
  }
  return Response.json(result);
};

const postResource = async (resources: Resources, data: ResourceDbInput): Promise<Response> => {
  return Response.json(await resources.createOne(data));
};

const postResourceById = async (
  resources: Resources,
  resourceId: string,
  data: Record<string, string>
): Promise<Response> => {
  if ('id' in data && data['id'].toLowerCase() != resourceId.toLowerCase()) {
    return new Response(JSON.stringify({ message: 'Ids do not match!' }), { status: 422 });
  }
  return Response.json(await resources.updateOne(resourceId, data));
};

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  const invalidConfigRejected = rejectInvalidConfig(context);
  if (invalidConfigRejected) {
    return invalidConfigRejected;
  }
  const url = new URL(context.request.url);
  const path = getNormalizedPath(url.pathname, BASE_PATH);
  const pathParts = path.split('/');
  const resources = new Resources(context.env.STACK_DB);
  const endpoint = pathParts[0];
  if (endpoint == '') {
    return Response.json(['resources', 'types', 'attachments']);
  }
  if (endpoint == 'resources') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'POST':
          return postResource(resources, await context.request.json());
        case 'GET':
          return getResource(resources, url);
        default:
          return getMethodNotAllowedResponse('GET, POST');
      }
    }
    if (pathParts.length == 2) {
      const resourceId = pathParts[1];
      switch (context.request.method) {
        case 'POST':
          return postResourceById(resources, resourceId, await context.request.json());
        case 'DELETE':
          return Response.json(await resources.deleteOne(resourceId));
        case 'GET':
          return getResourceById(resources, resourceId);
        default:
          return getMethodNotAllowedResponse('GET, POST, DELETE');
      }
    }
  }
  if (endpoint == 'types') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'GET':
          return Response.json(await resources.getTypes());
        default:
          return getMethodNotAllowedResponse('GET');
      }
    }
  }
  if (endpoint == 'attachments') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'GET':
          return Response.json(await resources.getAttachments());
        default:
          return getMethodNotAllowedResponse('GET');
      }
    }
  }
  return new Response(JSON.stringify({ message: 'Not Found!' }), { status: 404 });
};
