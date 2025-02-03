export const addLimitToQuery = (query: string, limit: number = 50): string => {
  return query + (limit ? ' LIMIT ' + limit : '');
};

export const getDbPositions = (n: number): string[] => {
  // Create an array containing '?1'..'?N' where N is the number of positions
  return Array.from({ length: n }, (_, i) => i + 1).map((n) => `?${n}`);
};
