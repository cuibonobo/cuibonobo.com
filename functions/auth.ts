interface AuthEnv {
  API_TOKEN: string;
}

type AuthEventCtxt = EventContext<AuthEnv, string, Record<string, unknown>>;

export const isAuthConfigured = (context: AuthEventCtxt): boolean => {
  return !!context.env.API_TOKEN;
};

export const isValidAuth = (context: AuthEventCtxt): boolean => {
  const authHeader: string | null = context.request.headers.get('Authorization');
  if (authHeader) {
    const authToken = authHeader.replace('Bearer ', '');
    return authToken == context.env.API_TOKEN;
  }
  return false;
};
