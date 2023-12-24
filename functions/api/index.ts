interface Env {
  STACK_DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Create a prepared statement with our query
  const ps = context.env.STACK_DB.prepare('SELECT * from resources');
  const data = await ps.first();

  return Response.json(data);
}
