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

// Models
const Resources = (db: D1Database) => {
  return {
    getAll: async (limit: number = 50): Promise<ResourcesDbResult[]> => {
      // Create a prepared statement with our query
      const ps = db.prepare(`SELECT * FROM resources${limit ? ' LIMIT ' + limit: ''}`);
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    },
  };
};

// Controllers
const getResources = async (context: RequestContext): Promise<Response> => {
  const results = await Resources(context.env.STACK_DB).getAll();
  return Response.json(results);
};

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  return getResources(context);
};
