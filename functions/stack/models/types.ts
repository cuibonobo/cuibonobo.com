import { z } from 'zod';
import { parseJsonPreprocessor } from '@codec/preprocessors.js';
import { IDatabase } from './db.js';
import { addLimitToQuery, getDbPositions } from './util.js';

const TypeDbResultShapeSchema = z.object({
  name: z.string(),
  hash: z.string(),
  schema: z.string(),
  singular: z.string(),
  plural: z.string(),
  created_date: z.string().datetime(),
  updated_date: z.string().datetime()
});
export const TypeDbResultSchema = z.preprocess(parseJsonPreprocessor, TypeDbResultShapeSchema);
const TypeDbCreateShapeSchema = TypeDbResultShapeSchema.partial({
  created_date: true,
  updated_date: true
});
export const TypeDbCreateSchema = z.preprocess(parseJsonPreprocessor, TypeDbCreateShapeSchema);

const TypeDbUpdateShapeSchema = TypeDbResultShapeSchema.partial();
export const TypeDbUpdateSchema = z.preprocess(parseJsonPreprocessor, TypeDbUpdateShapeSchema);

export type TypeDbResult = z.infer<typeof TypeDbResultSchema>;
export type TypeDbCreate = z.infer<typeof TypeDbCreateSchema>;
export type TypeDbUpdate = z.infer<typeof TypeDbUpdateSchema>;

export interface ITypes {
  getAll(limit?: number): Promise<TypeDbResult[]>;
  getOne(name: string): Promise<TypeDbResult>;
  createOne(t: TypeDbCreate): Promise<boolean>;
  updateOne(name: string, updates: TypeDbUpdate): Promise<boolean>;
  deleteOne(name: string): Promise<boolean>;
}

export class Types implements ITypes {
  _db: IDatabase;

  constructor(database: IDatabase) {
    this._db = database;
  }

  getAll = async (limit: number = 50): Promise<TypeDbResult[]> => {
    const ps = this._db.prepare(addLimitToQuery('SELECT * FROM types', limit));
    const data = await ps.all<TypeDbResult>();
    return data.results;
  };
  getOne = async (name: string): Promise<TypeDbResult> => {
    const ps = this._db
      .prepare('SELECT * FROM types where name = ?1 ORDER BY name DESC')
      .bind(name);
    return await ps.first<TypeDbResult>();
  };
  createOne = async (t: TypeDbCreate): Promise<boolean> => {
    const keys = Object.keys(t);
    const values = Object.values(t).map((v) => (typeof v == 'string' ? v : JSON.stringify(v)));
    const positions = getDbPositions(keys.length);
    const ps = this._db
      .prepare(`INSERT INTO types (${keys.join(', ')}) VALUES (${positions.join(', ')})`)
      .bind(...values);
    const data = await ps.run();
    return data.success;
  };
  updateOne = async (name: string, updates: TypeDbUpdate): Promise<boolean> => {
    const keys = Object.keys(updates);
    const values = Object.values(updates).map((v) =>
      typeof v == 'string' ? v : JSON.stringify(v)
    );
    const positions = getDbPositions(keys.length);
    const statements = keys.map((k, i) => `${k} = ${positions[i]}`);
    const ps = this._db
      .prepare(`UPDATE types SET ${statements.join(', ')} WHERE id = ?${keys.length + 1}`)
      .bind(...values, name);
    const data = await ps.run();
    return data.success;
  };
  deleteOne = async (name: string): Promise<boolean> => {
    const ps = this._db.prepare('DELETE FROM types where name = ?1').bind(name);
    const data = await ps.run();
    return data.success;
  };
}
