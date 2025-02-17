export interface IDatabaseResult<T extends Record<string, unknown> = Record<string, unknown>> {
  success: boolean;
  results: T[];
}
export interface IDatabasePreparedStatement {
  bind(...values: unknown[]): IDatabasePreparedStatement;
  run<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<IDatabaseResult<T>>;
  first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T>;
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<IDatabaseResult<T>>;
}
export interface IDatabase {
  prepare(query: string): IDatabasePreparedStatement;
}
