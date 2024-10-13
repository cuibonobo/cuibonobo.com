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
  return null
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
  const resources = Resources(context.env.STACK_DB);
  const endpoint = pathParts[0];
  if (endpoint == '') {
    return Response.json(['resources', 'types', 'attachments']);
  }
  if (endpoint == 'resources') {
    if (pathParts.length == 1) {
      switch(context.request.method) {
        case 'POST':
          const data: ResourceDbInput = await context.request.json();
          return Response.json(await resources.createOne(data));
        case 'GET':
          return Response.json(await resources.getAll());
        default:
          return getMethodNotAllowedResponse('GET, POST')
      }
    }
    if (pathParts.length == 2) {
      const resourceId = pathParts[1];
      switch(context.request.method) {
        case 'POST':
          const data: Record<string, string> = await context.request.json();
          if ('id' in data && data['id'].toLowerCase() != resourceId.toLowerCase()) {
            return new Response(JSON.stringify({ message: 'Ids do not match!' }), { status: 422 });
          }
          return Response.json(await resources.updateOne(resourceId, data));
        case 'DELETE':
          return Response.json(await resources.deleteOne(resourceId));
        case 'GET':
          const result = await resources.getOne(resourceId);
          if (result == null) {
            return Response.json({}, { status: 404 });
          }
          return Response.json(result);
        default:
          return getMethodNotAllowedResponse('GET, POST, DELETE');
      }
    }
  }
  if (endpoint == 'types') {
    if (pathParts.length == 1) {
      switch(context.request.method) {
        case 'GET':
          return Response.json(await resources.getTypes());
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
    if (pathParts.length == 2) {
      const typeId = pathParts[1];
      switch(context.request.method) {
        case 'GET':
          return Response.json(await resources.getAllByType(typeId));
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
    if (pathParts.length == 3) {
      const typeId = pathParts[1];
      const key = pathParts[2];
      switch(context.request.method) {
        case 'GET':
          return Response.json(await resources.getContentKey(typeId, key));
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
    if (pathParts.length == 4) {
      const typeId = pathParts[1];
      const key = pathParts[2];
      const value = pathParts[3];
      switch(context.request.method) {
        case 'GET':
          return Response.json(
            await resources.getByContentKey(typeId, key, value)
          );
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
  }
  if (endpoint == 'attachments') {
    if (pathParts.length == 1) {
      switch(context.request.method) {
        case 'GET':
          return Response.json(await resources.getAttachments());
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
    if (pathParts.length == 2) {
      const attachmentId = pathParts[1];
      switch(context.request.method) {
        case 'GET':
          return Response.json(await resources.getByAttachmentId(attachmentId));
        default:
          return getMethodNotAllowedResponse('GET')
      }
    }
  }
  return new Response(JSON.stringify({ message: 'Not Found!' }), { status: 404 });
};
