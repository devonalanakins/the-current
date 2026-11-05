-- Existing pending evidence has unknown preparer identity and cannot be approved.
-- It must be replaced by a fresh synthetic rehearsal, never inferred from authorship.
ALTER TABLE evidence ADD COLUMN prepared_by TEXT REFERENCES users;
CREATE TABLE version_contributors(version INTEGER NOT NULL REFERENCES versions, actor TEXT NOT NULL REFERENCES users, PRIMARY KEY(version,actor));
INSERT INTO version_contributors SELECT id,author FROM versions;
CREATE TRIGGER version_author_contributor AFTER INSERT ON versions BEGIN INSERT INTO version_contributors VALUES(NEW.id,NEW.author); END;
INSERT INTO migrations VALUES(2);
INSERT OR IGNORE INTO version_contributors SELECT version,actor FROM audit WHERE action='edit';
