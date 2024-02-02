interface ResourcesDbResult {
  id: string;
  type: string;
  created_date: string;
  updated_date: string;
  is_public: number;
  content: string;
}

const addLimitToQuery = (query: string, limit: number = 50): string => {
  return query + (limit ? ' LIMIT ' + limit : '');
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
export type {ResourcesDbResult};
