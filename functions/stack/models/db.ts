export interface IDatabaseResult<T = Record<string, unknown>> {
  success: boolean;
  results: T;
}
export interface IDatabasePreparedStatement {
  bind(...values: unknown[]): IDatabasePreparedStatement;
  run<T>(): Promise<IDatabaseResult<T>>;
  first<T>(): Promise<T>;
  all<T>(): Promise<IDatabaseResult<T[]>>;
}
export interface IDatabase {
  prepare(query: string): IDatabasePreparedStatement;
}
