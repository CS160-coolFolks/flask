# Setup

Install python3. Via Homebrew it's `brew install python3`.

Install the dependencies for this flask app with:

```sh
$ pip3 install flask scrypt
```

# Running

```sh
$ export FLASK_APP=main.py
$ export FLASK_DEBUG=true
$ flask run
```

This will launch the server and sets up a file watcher on Python files.
Unfortunately, it doesn't watch the SQL files so if you modify one of those you
have to re-run `flask run` for them to take effect.