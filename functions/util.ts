// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Context<T> = EventContext<T, any, Record<string, unknown>>;

export const getNormalizedPath = (absPath: string, basePath: string): string => {
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

export const createMethodNotAllowedResponse = (allowedMethods: string): Response => {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: allowedMethods
    }
  });
};
