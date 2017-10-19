import hashlib
import os
import re

import scrypt
from flask import Flask, json, session, redirect, request, render_template

import database
from LogParser import LogStringParser


SALT_LENGTH = 64

app = Flask(__name__)


@app.route('/')
def index():
    if 'email' in session:
        return redirect('/file_management')
    else:
        return redirect('/sign_in?next=/file_management')


@app.route('/sign_in')
def get_sign_in():
    next_url = request.args['next']
    return render_template('sign_in.html', next=next_url)


@app.route('/sign_in', methods=['POST'])
def post_sign_in():
    next_url = request.args['next']
    email = request.form['email']
    password = request.form['password']

    # Check if the fields were filled.
    email_valid = email is not None and email != ''
    email_feedback = 'Please enter your email address'

    password_valid = password is not None and password != ''
    password_feedback = 'Please enter your password'

    # Check if the fields match our simple regex.
    #if email_valid:
        #email_valid = re.match(r'[^@]+@[^@]+\.[^@]+', email)
        #email_feedback = 'The value you’ve entered is not a valid email address'

    if password_valid:
        password_valid = len(password) >= 6
        password_feedback = 'The password you’ve entered is too short to be valid'

    # Check if the user exists in the DB.
    if email_valid:
        email_valid = database.user_exists(email)
        email_feedback = 'The email you’ve entered doesn’t match any account'

    # Check if the password is correct. Do not run this check if the email is incorrect, since we can't tell if the user
    # inputted a correct password or not until they input a correct email.
    if email_valid and password_valid:
        salt, password_hash = database.get_password(email)
        password_valid = password_hash == scrypt.hash(password, salt)
        password_feedback = 'The password you’ve entered is incorrect'

    if email_valid and password_valid:
        # Set the login cookie.
        session['user_id'] = database.get_user_id(email)
        session['email'] = email

        return redirect(next_url)
    else:
        return render_template('sign_in.html',
                               next=next_url,
                               email=email,
                               email_valid=email_valid,
                               email_feedback=email_feedback,
                               password=password,
                               password_valid=password_valid,
                               password_feedback=password_feedback)


@app.route('/sign_up')
def get_sign_up():
    next_url = request.args['next']
    return render_template('sign_up.html', next=next_url)


@app.route('/sign_up', methods=['POST'])
def post_sign_up():
    next_url = request.args['next']
    email = request.form['email']
    password = request.form['password']
    confirmation = request.form['confirmation']

    # Check if the fields were filled.
    email_valid = email is not None and email != ''
    email_feedback = 'Please enter your email address'

    password_valid = password is not None and password != ''
    password_feedback = 'Please enter your password'

    confirmation_valid = confirmation is not None and confirmation != ''
    confirmation_feedback = 'Please enter your password again'

    # Check if the fields match our simple regex.
    if email_valid:
        email_valid = re.match(r'[^@]+@[^@]+\.[^@]+', email)
        email_feedback = 'The value you’ve entered is not a valid email address'

    if password_valid:
        password_valid = len(password) >= 6
        password_feedback = 'The password you’ve entered is too short to be valid'

    if confirmation_valid:
        confirmation_valid = password == confirmation
        confirmation_feedback = 'The passwords you’ve entered don’t match'

    # Check if the user does not already exist in the DB.
    if email_valid:
        email_valid = not database.user_exists(email)
        email_feedback = 'The email you’ve entered is already in use by another account'

    if email_valid and password_valid and confirmation_valid:
        # Hash the password.
        salt = os.urandom(SALT_LENGTH)
        password_hash = scrypt.hash(password, salt)

        # Create the user and their password in the database.
        user_id = database.create_user(email)
        database.create_password(user_id, salt, password_hash)

        # Set the login cookie.
        session['user_id'] = user_id
        session['email'] = email

        return redirect(next_url)
    else:
        return render_template('sign_up.html',
                               next=next_url,
                               email=email,
                               email_valid=email_valid,
                               email_feedback=email_feedback,
                               password=password,
                               password_valid=password_valid,
                               password_feedback=password_feedback,
                               confirmation=confirmation,
                               confirmation_valid=confirmation_valid,
                               confirmation_feedback=confirmation_feedback)


@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')


def free_disk_space():
    # https://stackoverflow.com/a/12327880
    f = os.open('.', os.O_RDONLY)
    stats = os.fstatvfs(f)
    return stats.f_frsize * stats.f_bavail


@app.route('/file_management')
def get_file_management():
    if 'user_id' not in session:
        return redirect('/sign_in?next=/file_management')

    user_id = session['user_id']
    email = session['email']

    logs = database.get_log_filenames(user_id)

    return render_template('file_management.html',
                           page='file_management',
                           email=email,
                           logs=logs,
                           free_disk_space=free_disk_space() // 1024 // 1024)


@app.route('/file_management', methods=['POST'])
def post_file_management():
    if 'user_id' not in session:
        return redirect('/sign_in?next=/file_management')

    user_id = session['user_id']
    email = session['email']

    if 'add' in request.form:
        # The user pressed the 'Add file' button.
        if 'log' not in request.files or request.files['log'].filename == '':
            logs = database.get_log_filenames(user_id)
            upload_valid = False
            upload_feedback = 'You did’t select a file to upload'
            return render_template('file_management.html',
                                   page='file_management',
                                   email=email,
                                   logs=logs,
                                   upload_valid=upload_valid,
                                   upload_feedback=upload_feedback)

        new_log = request.files['log']
        filename = new_log.filename
        blob = new_log.read()

        h = hashlib.sha1()
        h.update(blob)
        hash = h.digest()

        log_content_id = None

        # Security warning: Since we are using SHA1, this is vulnerable to a hash-collision attack, which could
        #                   potentially result in a DoS.
        contents = database.get_log_contents(hash)
        for content in contents:
            if blob == content["blob"]:
                log_content_id = content["id"]
                break

        if log_content_id is None:
            log_content_id = database.create_log_content(hash, blob)

        database.create_log(user_id, filename, log_content_id)

    else:  # 'delete' in request.form
        # The user pressed the 'Delete' button.
        log_ids = [key for key in request.form if re.match(r'^\d+$', key)]
        for log_id in log_ids:
            database.delete_log(user_id, log_id)

    logs = database.get_log_filenames(user_id)

    return render_template('file_management.html',
                           page='file_management',
                           email=email,
                           logs=logs)


@app.route('/error_analysis')
def get_error_analysis():
    if 'user_id' not in session:
        return redirect('/sign_in?next=/file_management')

    user_id = session['user_id']
    email = session['email']

    logs = database.get_log_filenames(user_id)

    if logs is None:
        return redirect('/file_management')

    return render_template('error_analysis.html',
                           email=email,
                           logs=logs,
                           page="error_analysis")


@app.route('/error_analysis/data/<log_id>.json')
def get_error_analysis_data(log_id):
    if 'user_id' not in session:
        response = json.jsonify(error='Not signed in')
        response.status_code = 401
        return response

    user_id = session['user_id']

    log_content_id = database.get_log(user_id, log_id)

    if log_content_id is None:
        response = json.jsonify(error='Log file not found')
        response.status_code = 404
        return response

    # See if we've done the analysis at some point in the past already.
    analysis = database.get_analysis(log_content_id)

    # Nope, let's do it now.
    if analysis is None:
        blob = database.get_log_content(log_content_id)

        if blob is None:
            response = json.jsonify(error='Log file not found')
            response.status_code = 404
            return response

        blob = str(blob, 'utf-8')

        error_keys = [
            'exception',
            'warn',
            'error',
            'fail',
            'unauthorized',
            'timeout',
            'refused',
            'NoSuchPageException',
            # '404',
            # '401',
            # '500',
        ]

        confirmed_errors, confirmed_non_errors = database.get_all_confirmations()

        usage_keys = [
            'DockerServerController',
            'DockerVolumeController',
            'ProvisionController',
            'BlueprintController',
        ]

        # Put confirmed_errors and usage_keys in lists, which is what LogStringReader expects.
        confirmed_errors = map(lambda error: [error], confirmed_errors)
        usage_keys = map(lambda key: [key], usage_keys)

        error_reader = LogStringParser.LogStringReader(blob, error_keys, confirmed_errors, confirmed_non_errors)
        usage_reader = LogStringParser.LogStringReader(blob, [], usage_keys, [])

        # key: Aug 22 23:20:07 hfvm dchq_rabbitmq[38866]: Missed heartbeats from client, timeout: 60s
        # value: ['timeout']

        # ('Aug 23', '02:54:07', 'Aug 23 02:54:07 hfvm dchq_tomcat[38866]: 2017-08-23 09:54:07.301  INFO 1 --- [nio-8080-exec-4] o.s.b.a.audit.listener.AuditListener     : AuditEvent [timestamp=Wed Aug 23 09:54:07 UTC 2017, principal=anonymousUser, type=AUTHORIZATION_FAILURE, data={type=org.springframework.security.access.AccessDeniedException, message=Access is denied}]')

        analysis = {
            'maybe_new_errors': error_reader.maybe_new_errors(),
            'error_groups': error_reader.find_errors(),
            'usages': usage_reader.find_errors(),
        }

        database.create_analysis(log_content_id, analysis)

    return json.jsonify(analysis)


# Initialize database.
database.init_db(app)


# Initialize secret key used in HTTP cookies.
def init_secret():
    try:
        secret_key = open('secret_key', 'rb').read()
    except FileNotFoundError:
        secret_key = os.urandom(24)
        f = open('secret_key', 'wb')
        f.write(secret_key)
        f.close()

    app.secret_key = secret_key


init_secret()


if __name__ == '__main__':
    app.run()
