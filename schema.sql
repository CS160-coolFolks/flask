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

DROP TABLE IF EXISTS passwords;
CREATE TABLE passwords (
    user_id INTEGER PRIMARY KEY,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES  users (id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    blob TEXT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES  users (id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS confirmations;
CREATE TABLE confirmations (
    token TEXT PRIMARY KEY,
    is_error INTEGER NOT NULL  -- 0 for no, 1 for yes
);

DROP TABLE IF EXISTS analyses;
CREATE TABLE analyses (
    log_id INTEGER PRIMARY KEY,
    analysis_json TEXT NOT NULL,

    FOREIGN KEY (log_id) REFERENCES  logs (id) ON DELETE CASCADE
);

DROP INDEX IF EXISTS users_email;
CREATE UNIQUE INDEX users_email ON users (email);
