import { Resources, Types } from './models/index.js';
import {
  getResources,
  getResourceById,
  postResource,
  postResourceById
} from './controllers/resourceControllers.js';
import {
  deleteTypeByName,
  getTypes,
  getTypeByName,
  postType,
  postTypeByName
} from './controllers/typeControllers.js';
import { isAuthConfigured, isValidAuth } from '../auth.js';
import { getNormalizedPath, createMethodNotAllowedResponse } from '../util.js';
import type { Context } from '../util.js';

interface Env {
  STACK_DB: D1Database;
  API_TOKEN: string;
}

const BASE_PATH = '/stack';

const rejectInvalidConfig = (context: Context<Env>): Response | null => {
  if (!context.env.STACK_DB) {
    return Response.json({ message: 'Database not configured!' }, { status: 500 });
  }
  if (!isAuthConfigured(context)) {
    return Response.json({ message: 'API token not set!' }, { status: 500 });
  }
  if (!isValidAuth(context)) {
    return Response.json({ message: 'Forbidden.' }, { status: 400 });
  }
  return null;
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
  const types = new Types(context.env.STACK_DB);
  const endpoint = pathParts[0];
  if (endpoint == '') {
    return Response.json(['resources', 'types', 'attachments']);
  }
  if (endpoint == 'resources') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'POST':
          return postResource(resources, types, await context.request.json());
        case 'GET':
          return getResources(resources, url);
        default:
          return createMethodNotAllowedResponse('GET, POST');
      }
    }
    if (pathParts.length == 2) {
      const resourceId = pathParts[1];
      switch (context.request.method) {
        case 'POST':
          return postResourceById(resources, types, resourceId, await context.request.json());
        case 'DELETE':
          return Response.json(resources.deleteOne(resourceId));
        case 'GET':
          return getResourceById(resources, resourceId);
        default:
          return createMethodNotAllowedResponse('GET, POST, DELETE');
      }
    }
  }
  if (endpoint == 'types') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'POST':
          return postType(types, await context.request.text());
        case 'GET':
          return getTypes(types);
        default:
          return createMethodNotAllowedResponse('GET, POST');
      }
    }
    if (pathParts.length == 2) {
      const typeName = pathParts[1];
      switch (context.request.method) {
        case 'POST':
          return postTypeByName(types, typeName, await context.request.text());
        case 'DELETE':
          return deleteTypeByName(types, resources, typeName);
        case 'GET':
          return getTypeByName(types, typeName);
        default:
          return createMethodNotAllowedResponse('GET, POST, DELETE');
      }
    }
  }
  if (endpoint == 'attachments') {
    if (pathParts.length == 1) {
      switch (context.request.method) {
        case 'GET':
          return Response.json(await resources.getAttachments());
        default:
          return createMethodNotAllowedResponse('GET');
      }
    }
  }
  return new Response(JSON.stringify({ message: 'Not Found!' }), { status: 404 });
};
