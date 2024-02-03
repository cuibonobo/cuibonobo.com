import { Resources } from "./models.js";
import type { ResourcesDbInput } from "./models.js";

interface Env {
  STACK_DB: D1Database;
}

const BASE_PATH = "/stack";

const getNormalizedPath = (absPath: string, basePath: string = BASE_PATH): string => {
  let relPath = absPath;
  if (absPath.startsWith(basePath)) {
    relPath = relPath.substring(basePath.length);
  }
  if (relPath.startsWith('/')) {
    relPath = relPath.substring(1);
  }
  if (relPath.endsWith('/')) {
    relPath = relPath.substring(0, relPath.length - 1);
  }
  return relPath;
};

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  const url = new URL(context.request.url);
  const path = getNormalizedPath(url.pathname);
  const pathParts = path.split('/');
  const resources = Resources(context.env.STACK_DB);
  if (pathParts[0] == '') {
    return Response.json(['resources', 'types']);
  }
  if (pathParts[0] == 'resources') {
    if (pathParts.length == 1) {
      if (context.request.method == 'POST') {
        const data: ResourcesDbInput = await context.request.json();
        return Response.json(await resources.createOne(data));
      }
      return Response.json(await resources.getAll());
    }
    if (pathParts.length == 2) {
      if (context.request.method == 'POST') {
        const data: string = await context.request.text();
        return Response.json(await resources.updateOne(pathParts[1], data));
      }
      if (context.request.method == 'DELETE') {
        return Response.json(await resources.deleteOne(pathParts[1]));
      }
      return Response.json(await resources.getOne(pathParts[1]));
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
      return Response.json(await resources.getByContentKey(pathParts[1], pathParts[2], pathParts[3]));
    }
  }
  return new Response(JSON.stringify({ message: 'Not Found!' }), { status: 404 });
};
