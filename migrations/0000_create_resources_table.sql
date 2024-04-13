-- Migration number: 0000 	 2023-12-25T22:03:15.732Z
DROP TABLE IF EXISTS resources;
CREATE TABLE resources (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  content JSON DEFAULT "{}" NOT NULL
);

CREATE INDEX idx_resources_type ON resources (type);

CREATE TRIGGER [update_datetime_on_resources]
AFTER UPDATE OF id, type, created_date, is_public, content ON resources FOR EACH ROW
WHEN OLD.updated_date = NEW.updated_date
BEGIN
    UPDATE resources SET updated_date=CURRENT_TIMESTAMP WHERE id=NEW.id;
END;
