PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS schema_version;
CREATE TABLE schema_version (
    last_modified INTEGER
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL
);

DROP INDEX IF EXISTS users_email;
CREATE UNIQUE INDEX users_email ON users (email);

DROP TABLE IF EXISTS passwords;
CREATE TABLE passwords (
    user_id INTEGER PRIMARY KEY,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES  users (id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS log_contents;
CREATE TABLE log_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blob TEXT NOT NULL,
    hash TEXT NOT NULL
);

DROP INDEX IF EXISTS log_contents_hash;
CREATE INDEX log_contents_hash ON log_contents (hash);

DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    log_content_id INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (log_content_id) REFERENCES log_contents (id) ON DELETE CASCADE
);

DROP INDEX IF EXISTS log_log_content_id;
CREATE INDEX log_log_content_id ON logs (log_content_id);

-- When the last log that refers to a log_contents is deleted, also delete that log_contents.
DROP TRIGGER IF EXISTS delete_log_contents;
CREATE TRIGGER delete_log_contents AFTER DELETE ON logs
BEGIN
    DELETE FROM log_contents
    WHERE old.log_content_id = log_contents.id AND
          (SELECT COUNT(*)
           FROM logs
           WHERE logs.log_content_id = log_contents.id) = 0;
END;

DROP TABLE IF EXISTS confirmations;
CREATE TABLE confirmations (
    token TEXT PRIMARY KEY,
    is_error INTEGER NOT NULL  -- 0 for no, 1 for yes
);

DROP TABLE IF EXISTS analyses;
CREATE TABLE analyses (
    log_content_id INTEGER PRIMARY KEY,
    analysis_json TEXT NOT NULL,

    FOREIGN KEY (log_content_id) REFERENCES log_contents (id) ON DELETE CASCADE
);
