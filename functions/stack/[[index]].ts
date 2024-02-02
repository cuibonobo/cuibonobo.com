interface Env {
  STACK_DB: D1Database;
}

interface ResourcesDbResult {
  id: string;
  type: string;
  created_date: string;
  updated_date: string;
  is_public: number;
  content: string;
}

type RequestContext = EventContext<Env, any, Record<string, unknown>>;

const BASE_PATH = "/stack";

const getRelativePath = (absPath: string, basePath: string = BASE_PATH): string => {
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

const addLimitToQuery = (query: string, limit: number = 50): string => {
  return query + (limit ? ' LIMIT ' + limit : '');
};

// Models
const Resources = (db: D1Database) => {
  return {
    getAll: async (limit: number = 50): Promise<ResourcesDbResult[]> => {
      const ps = db.prepare(addLimitToQuery('SELECT * FROM resources', limit));
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    },
    getAllByType: async (type: string, limit: number = 50): Promise<ResourcesDbResult[]> => {
      const ps = db.prepare(addLimitToQuery('SELECT * FROM resources WHERE type = ?1', limit)).bind(type);
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    },
    getOne: async (id: string): Promise<ResourcesDbResult> => {
      const ps = db.prepare('SELECT * FROM resources where id = ?1').bind(id);
      return await ps.first<ResourcesDbResult>();
    },
    getTypes: async (): Promise<string[]> => {
      const ps = db.prepare('SELECT DISTINCT type FROM resources');
      const data = await ps.all<Record<string, string>>();
      return data.results.map(item => item.type);
    },
    getContentKey: async (type: string, key: string, limit: number = 50): Promise<Record<string, string>[]> => {
      let query = 'SELECT id, json_extract(content, ?2) AS key FROM resources WHERE type = ?1 AND json_type(content, ?2) IS NOT NULL';
      const ps = db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`);
      const data = await ps.all<Record<string, string>>();
      return data.results;
    },
    getByContentKey: async (type: string, key: string, value: string, limit: number = 50): Promise<ResourcesDbResult[]> => {
      let query = 'SELECT * FROM resources WHERE type = ?1 AND content->>?2 = ?3';
      const ps = db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`, value);
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    }
  };
};

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  const url = new URL(context.request.url);
  const path = getRelativePath(url.pathname);
  const resources = Resources(context.env.STACK_DB);
  if (path == '') {
    return Response.json(['resources', 'types']);
  }
  if (path == 'resources') {
    return Response.json(await resources.getAll());
  }
  if (path == 'types') {
    return Response.json(await resources.getTypes());
  }
  if (path.startsWith('types')) {
    const pathParts = path.split('/');
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
