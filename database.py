from flask import g
import json
import os


SCHEMA_FILE = 'schema.sql'


def init_schema():
    if db_is_empty() or need_schema_update():
        print('Updating schema, dropping all tables')

        schema = open(SCHEMA_FILE).read()
        g.db.cursor().executescript(schema)

        schema_mod_time = int(os.stat(SCHEMA_FILE).st_mtime)
        query_db("""
                 INSERT INTO schema_version (last_modified)
                 VALUES (?)
                 """, [schema_mod_time])

        g.db.commit()


def db_is_empty():
    rows = query_db("""
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table'
                    """)
    return rows is None or len(rows) == 0


#
# TABLE schema_version
#


def need_schema_update():
    row = query_db("""
                   SELECT last_modified
                   FROM schema_version
                   """, one=True)
    if row is None:
        return True

    db_mod_time = row['last_modified']
    schema_mod_time = int(os.stat(SCHEMA_FILE).st_mtime)
    return schema_mod_time > db_mod_time


#
# TABLE users
#


def user_exists(email):
    print('email', email)
    row = query_db("""
                   SELECT id
                   FROM users
                   WHERE email = ?
                   """, [email], one=True)
    return True if row else False


def get_user_id(email):
    row = query_db("""
                   SELECT id
                   FROM users
                   WHERE email = ?
                   """, [email], one=True)
    return row['id'] if row else None


def get_password(email):
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
    query_db("""
             INSERT INTO passwords (user_id, salt, password_hash)
             VALUES (?, ?, ?)
             """, [user_id, salt, password_hash])

    g.db.commit()


#
# TABLE logs
#


def get_log_filenames(user_id):
    return query_db("""
                    SELECT id, filename
                    FROM logs
                    WHERE user_id = ?
                    """, [user_id])


def get_log(user_id, log_id):
    log = query_db("""
                   SELECT blob
                   FROM logs
                   WHERE user_id = ? AND
                         id = ?
                   """, [user_id, log_id], one=True)
    return log["blob"] if log else None


def create_log(user_id, filename, log_content_id):
    query_db("""
             INSERT INTO logs (user_id, filename, log_content_id)
             VALUES (?, ?, ?)
             """, [user_id, filename, log_content_id])

    g.db.commit()


def delete_log(user_id, log_id):
    query_db("""
             DELETE FROM logs
             WHERE user_id = ? AND
                   id = ?
             """, [user_id, log_id])

    g.db.commit()


#
# TABLE log_contents
#


def get_log_contents(hash):
    return query_db("""
                    SELECT id, blob
                    FROM log_contents
                    WHERE hash = ?
                    """, [hash])


def create_log_content(hash, blob):
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


# No delete_log_content function needed because log_contents are automatically deleted when the last log that refers to
# them is deleted. :)


#
# TABLE confirmations
#


def get_all_confirmations():
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
    row = query_db("""
                   SELECT analysis_json
                   FROM analyses
                   WHERE log_content_id = ?
                   """, [log_content_id], one=True)

    return json.loads(row['analysis_json']) if row else None


def create_analysis(log_content_id, analysis):
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
    print('query', query)
    cur = g.db.execute(query, args)
    rows = cur.fetchall()
    cur.close()
    return (rows[0] if rows else None) if one else rows
