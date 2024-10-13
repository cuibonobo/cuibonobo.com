import { Attachment, ResourceDbInput, ResourceDbResult } from '@codec/resource.js';

const addLimitToQuery = (query: string, limit: number = 50): string => {
  return query + (limit ? ' LIMIT ' + limit : '');
};

const getDbPositions = (n: number): string[] => {
  // Create an array containing '?1'..'?N' where N is the number of positions
  return Array.from({ length: n }, (_, i) => i + 1).map((n) => `?${n}`);
};

export class Resources {
  _db: D1Database;

  constructor(d1: D1Database) {
    this._db = d1;
  }

  getAll = async (limit: number = 50): Promise<ResourceDbResult[]> => {
    const ps = this._db.prepare(addLimitToQuery('SELECT * FROM resources', limit));
    const data = await ps.all<ResourceDbResult>();
    return data.results;
  };
  getAllByType = async (type: string, limit: number = 50): Promise<ResourceDbResult[]> => {
    const ps = this._db
      .prepare(addLimitToQuery('SELECT * FROM resources WHERE type = ?1 ORDER BY id DESC', limit))
      .bind(type);
    const data = await ps.all<ResourceDbResult>();
    return data.results;
  };
  getOne = async (id: string): Promise<ResourceDbResult> => {
    const ps = this._db.prepare('SELECT * FROM resources where id = ?1 ORDER BY id DESC').bind(id);
    return await ps.first<ResourceDbResult>();
  };
  createOne = async (resource: ResourceDbInput): Promise<boolean> => {
    const keys = Object.keys(resource);
    const values = Object.values(resource).map((v) =>
      typeof v == 'string' ? v : JSON.stringify(v)
    );
    const positions = getDbPositions(keys.length);
    const ps = this._db
      .prepare(`INSERT INTO resources (${keys.join(', ')}) VALUES (${positions.join(', ')})`)
      .bind(...values);
    const data = await ps.run();
    return data.success;
  };
  updateOne = async (id: string, updates: Record<string, string>): Promise<boolean> => {
    delete updates['id'];
    const keys = Object.keys(updates);
    const values = Object.values(updates).map((v) =>
      typeof v == 'string' ? v : JSON.stringify(v)
    );
    const positions = getDbPositions(keys.length);
    const statements = keys.map((k, i) => `${k} = ${positions[i]}`);
    const ps = this._db
      .prepare(`UPDATE resources SET ${statements.join(', ')} WHERE id = ?${keys.length + 1}`)
      .bind(...values, id);
    const data = await ps.run();
    return data.success;
  };
  deleteOne = async (id: string): Promise<boolean> => {
    const ps = this._db.prepare('DELETE FROM resources where id = ?1').bind(id);
    const data = await ps.run();
    return data.success;
  };
  getTypes = async (): Promise<string[]> => {
    const ps = this._db.prepare('SELECT DISTINCT type FROM resources');
    const data = await ps.all<Record<string, string>>();
    return data.results.map((item) => item.type);
  };
  getContentKey = async (
    type: string,
    key: string,
    limit: number = 50
  ): Promise<Record<string, string>[]> => {
    const query =
      'SELECT id, json_extract(content, ?2) AS key FROM resources WHERE type = ?1 AND ' +
      'json_type(content, ?2) IS NOT NULL ORDER BY id DESC';
    const ps = this._db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`);
    const data = await ps.all<Record<string, string>>();
    return data.results;
  };
  getByContentKey = async (
    type: string,
    key: string,
    value: string,
    limit: number = 50
  ): Promise<ResourceDbResult[]> => {
    const query = 'SELECT * FROM resources WHERE type = ?1 AND content->>?2 = ?3 ORDER BY id DESC';
    const ps = this._db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`, value);
    const data = await ps.all<ResourceDbResult>();
    return data.results;
  };
  getAttachments = async (limit: number = 50): Promise<Attachment[]> => {
    const query =
      'SELECT DISTINCT json_extract(json_each.value, "$.id") AS id, json_extract(json_each.value, "$.name") AS name, ' +
      'json_extract(json_each.value, "$.tag") AS tag FROM resources, json_each(resources.attachments) ORDER BY id DESC';
    const ps = this._db.prepare(addLimitToQuery(query, limit));
    const data = await ps.all<Attachment>();
    return data.results;
  };
  getByAttachmentId = async (id: string, limit: number = 50): Promise<ResourceDbResult[]> => {
    const query =
      'SELECT resources.id,resources.type,resources.created_date,resources.updated_date,resources.is_public,' +
      'resources.attachments,resources.content FROM resources, json_each(resources.attachments) ' +
      'WHERE json_extract(json_each.value, "$.id") = ?1';
    const ps = this._db.prepare(addLimitToQuery(query, limit)).bind(id);
    const data = await ps.all<ResourceDbResult>();
    return data.results;
  };
}
