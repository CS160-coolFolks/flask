import json
import os
import sqlite3
import time

from flask import g


DB_SETUP_FILES = [
    'schema.sql',
    'starter_confirmations.sql'
]

DATABASE_FILE = 'database.sqlite3'


#
# Database initialization.
#


def init_db(app):
    # Call close_db() every time an app context dies. This includes at the end of handling every HTTP request, but also
    # at the end of the `with` statement just below.
    app.teardown_appcontext_funcs.append(close_db)

    with app.app_context():
        connect_db()
        init_schema()


def init_schema():
    if db_is_empty() or need_schema_update():
        print('Updating schema, dropping all tables')

        latest_setup_file_mod_time = 0

        for setup_file in DB_SETUP_FILES:
            script = open(setup_file).read()
            g.db.cursor().executescript(script)

            setup_file_mod_time = int(os.stat(setup_file).st_mtime)
            if latest_setup_file_mod_time < setup_file_mod_time:
                latest_setup_file_mod_time = setup_file_mod_time

        query_db("""
                 INSERT INTO schema_version (last_modified)
                 VALUES (?)
                 """, [latest_setup_file_mod_time])

        g.db.commit()


def db_is_empty():
    rows = query_db("""
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table'
                    """)
    return rows is None or len(rows) == 0


def need_schema_update():
    row = query_db("""
                   SELECT last_modified
                   FROM schema_version
                   """, one=True)
    if row is None:
        return True

    db_mod_time = row['last_modified']

    for setup_file in DB_SETUP_FILES:
        setup_file_mod_time = int(os.stat(setup_file).st_mtime)
        if setup_file_mod_time > db_mod_time:
            return True

    return False


#
# Database lifecycle.
#


def connect_db():
    if not hasattr(g, 'db'):
        g.db = sqlite3.connect(DATABASE_FILE)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()


#
# TABLE users
#


def user_exists(email):
    connect_db()

    row = query_db("""
                   SELECT id
                   FROM users
                   WHERE email = ?
                   """, [email], one=True)
    return True if row else False


def get_user_id(email):
    connect_db()

    row = query_db("""
                   SELECT id
                   FROM users
                   WHERE email = ?
                   """, [email], one=True)
    return row['id'] if row else None


def get_password(email):
    connect_db()

    row = query_db("""
                   SELECT salt, password_hash
                   FROM users, passwords
                   WHERE id = user_id and
                         email = ?
                   """, [email], one=True)
    if row:
        return row['salt'], row['password_hash']
    else:
        return None, None


def create_user(email):
    connect_db()

    # Create a user without specifying their id. SQLite will automatically allocate an id for them but won't tell us
    # what it is.
    query_db("""
             INSERT INTO users (email)
             VALUES (?)
             """, [email])

    g.db.commit()

    # Query the sqlite_sequence table, as recommended by Stack Overflow, to find the id.
    row = query_db("""
                   SELECT seq
                   FROM sqlite_sequence
                   WHERE name = "users"
                   """, one=True)
    assert(row is not None)

    return row['seq']


#
# TABLE passwords
#


def create_password(user_id, salt, password_hash):
    connect_db()

    query_db("""
             INSERT INTO passwords (user_id, salt, password_hash)
             VALUES (?, ?, ?)
             """, [user_id, salt, password_hash])

    g.db.commit()


#
# TABLE log_contents
#


def get_log_contents(hash):
    connect_db()

    return query_db("""
                    SELECT id, blob
                    FROM log_contents
                    WHERE hash = ?
                    """, [hash])


def create_log_content(hash, blob):
    connect_db()

    # Create a log_content without specifying its id. SQLite will automatically allocate an id for them but won't tell
    # us what it is.
    query_db("""
             INSERT INTO log_contents (blob, hash)
             VALUES (?, ?)
             """, [blob, hash])

    g.db.commit()

    # Query the sqlite_sequence table, as recommended by Stack Overflow, to find the id.
    row = query_db("""
                   SELECT seq
                   FROM sqlite_sequence
                   WHERE name = "log_contents"
                   """, one=True)
    assert(row is not None)

    return row['seq']


def get_log_content(log_content_id):
    connect_db()

    log_content = query_db("""
                           SELECT blob
                           FROM log_contents
                           WHERE id = ?
                           """, [log_content_id], one=True)
    return log_content["blob"] if log_content else None


# No delete_log_content function needed because log_contents are automatically deleted when the last log that refers to
# them is deleted. :)


#
# TABLE logs
#


def get_log_filenames(user_id):
    connect_db()

    return query_db("""
                    SELECT id, filename
                    FROM logs
                    WHERE user_id = ?
                    """, [user_id])


def get_log(user_id, log_id):
    connect_db()

    log = query_db("""
                   SELECT log_content_id
                   FROM logs
                   WHERE logs.user_id = ? AND
                         logs.id = ?
                   """, [user_id, log_id], one=True)
    return log["log_content_id"] if log else None


def create_log(user_id, filename, log_content_id):
    connect_db()

    creation_time = int(time.time())

    query_db("""
             INSERT INTO logs (user_id, filename, log_content_id, creation_time)
             VALUES (?, ?, ?, ?)
             """, [user_id, filename, log_content_id, creation_time])

    g.db.commit()


def delete_log(user_id, log_id):
    connect_db()

    query_db("""
             DELETE FROM logs
             WHERE user_id = ? AND
                   id = ?
             """, [user_id, log_id])

    g.db.commit()


#
# TABLE confirmations
#


def get_all_confirmations():
    connect_db()

    rows = query_db("""
                    SELECT token, is_error
                    FROM confirmations
                    """)

    confirmed_errors = []
    confirmed_non_errors = []

    for row in rows:
        if row['is_error']:
            confirmed_errors.append(row['token'])
        else:
            confirmed_non_errors.append(row['token'])

    return confirmed_errors, confirmed_non_errors


def create_confirmation(token, is_error):
    connect_db()

    is_error = int(is_error)

    query_db("""
             INSERT INTO confirmations (token, is_error)
             VALUES (?, ?)
             """, [token, is_error])

    # Creating a confirmation invalidates all stored analyses. This is a possible area for optimization.
    # TODO: Just create a re-analyze button.
    query_db("""
             DELETE FROM analyses
             """)

    g.db.commit()


#
# TABLE analyses
#


def get_analysis(log_content_id):
    connect_db()

    row = query_db("""
                   SELECT analysis_json
                   FROM analyses
                   WHERE log_content_id = ?
                   """, [log_content_id], one=True)

    return json.loads(row['analysis_json']) if row else None


def create_analysis(log_content_id, analysis):
    connect_db()

    analysis_json = json.dumps(analysis)

    query_db("""
             INSERT INTO analyses (log_content_id, analysis_json)
             VALUES (?, ?)
             """, [log_content_id, analysis_json])

    g.db.commit()


#
# Helper functions.
#


def query_db(query, args=(), one=False):
    cur = g.db.execute(query, args)
    rows = cur.fetchall()
    cur.close()
    return (rows[0] if rows else None) if one else rows
