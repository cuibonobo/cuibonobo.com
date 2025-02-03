-- Migration number: 0002 	 2024-11-30T18:10:15.732Z
DROP TABLE IF EXISTS types;
CREATE TABLE types (
  name TEXT PRIMARY KEY NOT NULL,
  hash TEXT NOT NULL,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  schema text NOT NULL,
  singular text NOT NULL,
  plural text not null
);

CREATE INDEX idx_types_name ON types (name);

CREATE TRIGGER [update_datetime_on_types]
AFTER UPDATE OF name, hash, created_date, schema, singular, plural ON types FOR EACH ROW
WHEN OLD.updated_date = NEW.updated_date
BEGIN
    UPDATE types SET updated_date=CURRENT_TIMESTAMP WHERE name=NEW.name;
END;
