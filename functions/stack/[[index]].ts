import { Resources } from './models.js';
import type { ResourceDbInput } from '@codec/resource.js';
import { isAuthConfigured, isValidAuth } from '../auth.js';
import { getNormalizedPath } from '../util.js';

interface Env {
  STACK_DB: D1Database;
  API_TOKEN: string;
}

const BASE_PATH = '/stack';

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  if (!isAuthConfigured(context)) {
    return new Response(JSON.stringify({ message: 'API token not set!' }), { status: 500 });
  }
  if (!isValidAuth(context)) {
    return new Response(JSON.stringify({ message: 'Forbidden.' }), { status: 400 });
  }
  const url = new URL(context.request.url);
  const path = getNormalizedPath(url.pathname, BASE_PATH);
  const pathParts = path.split('/');
  const resources = Resources(context.env.STACK_DB);
  if (pathParts[0] == '') {
    return Response.json(['resources', 'types', 'attachments']);
  }
  if (pathParts[0] == 'resources') {
    if (pathParts.length == 1) {
      if (context.request.method == 'POST') {
        const data: ResourceDbInput = await context.request.json();
        return Response.json(await resources.createOne(data));
      }
      return Response.json(await resources.getAll());
    }
    if (pathParts.length == 2) {
      if (context.request.method == 'POST') {
        const data: Record<string, string> = await context.request.json();
        if ('id' in data && data['id'].toLowerCase() != pathParts[1].toLowerCase()) {
          return new Response(JSON.stringify({ message: 'Ids do not match!' }), { status: 422 });
        }
        return Response.json(await resources.updateOne(pathParts[1], data));
      }
      if (context.request.method == 'DELETE') {
        return Response.json(await resources.deleteOne(pathParts[1]));
      }
      const result = await resources.getOne(pathParts[1]);
      if (result == null) {
        return Response.json({}, { status: 404 });
      }
      return Response.json(result);
    }
  }
  if (pathParts[0] == 'types') {
    if (pathParts.length == 1) {
      return Response.json(await resources.getTypes());
    }
    if (pathParts.length == 2) {
      return Response.json(await resources.getAllByType(pathParts[1]));
    }
    if (pathParts.length == 3) {
      return Response.json(await resources.getContentKey(pathParts[1], pathParts[2]));
    }
    if (pathParts.length == 4) {
      return Response.json(
        await resources.getByContentKey(pathParts[1], pathParts[2], pathParts[3])
      );
    }
  }
  if (pathParts[0] == 'attachments') {
    if (pathParts.length == 1) {
      return Response.json(await resources.getAttachments());
    }
    if (pathParts.length == 2) {
      return Response.json(await resources.getByAttachmentId(pathParts[1]));
    }
  }
  return new Response(JSON.stringify({ message: 'Not Found!' }), { status: 404 });
};
