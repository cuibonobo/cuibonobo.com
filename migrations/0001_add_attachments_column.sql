-- Migration number: 0001 	 2024-04-29T18:36:41.706Z
ALTER TABLE resources ADD COLUMN attachments JSON DEFAULT "[]" NOT NULL;
