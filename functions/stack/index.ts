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

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.STACK_DB) {
    return new Response(JSON.stringify({ message: 'Database not configured!' }), { status: 500 });
  }
  // Create a prepared statement with our query
  const ps = context.env.STACK_DB.prepare('SELECT * FROM resources LIMIT 50');
  const data = await ps.all<ResourcesDbResult>();

  return Response.json(data.results);
};
