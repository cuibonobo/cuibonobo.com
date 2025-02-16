import { z } from 'zod';
import { Type } from '@codec/type.js';
import { parseJsonPreprocessor } from '@codec/preprocessors.js';
import { addLimitToQuery, getDbPositions } from './util.js';

const TypeDbCreateShapeSchema = z.object({
  name: z.string(),
  hash: z.string(),
  schema: z.string(),
  singular: z.string(),
  plural: z.string()
});
export const TypeDbCreateSchema = z.preprocess(parseJsonPreprocessor, TypeDbCreateShapeSchema);

const TypeDbUpdateShapeSchema = TypeDbCreateShapeSchema.partial();
export const TypeDbUpdateSchema = z.preprocess(parseJsonPreprocessor, TypeDbUpdateShapeSchema);

export type TypeDbCreate = z.infer<typeof TypeDbCreateSchema>;
export type TypeDbUpdate = z.infer<typeof TypeDbUpdateSchema>;

export class Types {
  _db: D1Database;

  constructor(d1: D1Database) {
    this._db = d1;
  }

  getAll = async (limit: number = 50): Promise<Type[]> => {
    const ps = this._db.prepare(addLimitToQuery('SELECT * FROM types', limit));
    const data = await ps.all<Type>();
    return data.results;
  };
  getOne = async (name: string): Promise<Type> => {
    const ps = this._db
      .prepare('SELECT * FROM types where name = ?1 ORDER BY name DESC')
      .bind(name);
    return await ps.first<Type>();
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
