interface ResourcesDbRequired {
  id: string,
  type: string
}

interface ResourcesDbOptional {
  created_date: string;
  updated_date: string;
  is_public: number;
  content: string;
}

type ResourcesDbResult = ResourcesDbRequired & ResourcesDbOptional;
type ResourcesDbInput = ResourcesDbRequired & Partial<ResourcesDbOptional>;

const addLimitToQuery = (query: string, limit: number = 50): string => {
  return query + (limit ? ' LIMIT ' + limit : '');
};

const getDbPositions = (n: number): string[] => {
  // Create an array containing '?1'..'?N' where N is the number of positions
  return Array.from({length: n}, (_, i) => i + 1).map(n => `?${n}`);
};

const Resources = (db: D1Database) => {
  return {
    getAll: async (limit: number = 50): Promise<ResourcesDbResult[]> => {
      const ps = db.prepare(addLimitToQuery('SELECT * FROM resources', limit));
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    },
    getAllByType: async (type: string, limit: number = 50): Promise<ResourcesDbResult[]> => {
      const ps = db.prepare(addLimitToQuery('SELECT * FROM resources WHERE type = ?1', limit)).bind(type);
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    },
    getOne: async (id: string): Promise<ResourcesDbResult> => {
      const ps = db.prepare('SELECT * FROM resources where id = ?1').bind(id);
      return await ps.first<ResourcesDbResult>();
    },
    createOne: async (resource: ResourcesDbInput): Promise<boolean> => {
      const keys = Object.keys(resource);
      const values = Object.values(resource).map(v => typeof(v) == 'string' ? v : JSON.stringify(v));
      const positions = getDbPositions(keys.length);
      const ps = db.prepare(`INSERT INTO resources (${keys.join(', ')}) VALUES (${positions.join(', ')})`).bind(...values);
      const data = await ps.run();
      return data.success;
    },
    updateOne: async (id: string, updates: Record<string, string>): Promise<boolean> => {
      delete updates['id'];
      const keys = Object.keys(updates);
      const values = Object.values(updates).map(v => typeof(v) == 'string' ? v : JSON.stringify(v));
      const positions = getDbPositions(keys.length);
      const statements = keys.map((k, i) => `${k} = ${positions[i]}`);
      const ps = db.prepare(`UPDATE resources SET ${statements.join(', ')} WHERE id = ?${keys.length + 1}`).bind(...values, id);
      const data = await ps.run();
      return data.success;
    },
    deleteOne: async (id: string): Promise<boolean> => {
      const ps = db.prepare('DELETE FROM resources where id = ?1').bind(id);
      const data = await ps.run();
      return data.success;
    },
    getTypes: async (): Promise<string[]> => {
      const ps = db.prepare('SELECT DISTINCT type FROM resources');
      const data = await ps.all<Record<string, string>>();
      return data.results.map(item => item.type);
    },
    getContentKey: async (type: string, key: string, limit: number = 50): Promise<Record<string, string>[]> => {
      let query = 'SELECT id, json_extract(content, ?2) AS key FROM resources WHERE type = ?1 AND json_type(content, ?2) IS NOT NULL';
      const ps = db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`);
      const data = await ps.all<Record<string, string>>();
      return data.results;
    },
    getByContentKey: async (type: string, key: string, value: string, limit: number = 50): Promise<ResourcesDbResult[]> => {
      let query = 'SELECT * FROM resources WHERE type = ?1 AND content->>?2 = ?3';
      const ps = db.prepare(addLimitToQuery(query, limit)).bind(type, `$.${key}`, value);
      const data = await ps.all<ResourcesDbResult>();
      return data.results;
    }
  };
};

export {Resources};
export type {ResourcesDbResult, ResourcesDbInput};
