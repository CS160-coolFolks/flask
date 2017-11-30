# Flask

[![Build Status](https://travis-ci.org/CS160-coolFolks/flask.svg?branch=master)](https://travis-ci.org/CS160-coolFolks/flask)

The main UI for running the log analysis process for SJSU's CS160 in Fall 2017.

## Deploying to localhost

### Setup

Install python3. Via Homebrew it's `brew install python3`.

Create a virtualenv.

```sh
$ python3 -m venv env
$ source env/bin/activate
```

Install the dependencies for this flask app with:

```sh
$ pip3 install flask scrypt
```

### Running

```sh
$ source env/bin/activate
$ export FLASK_APP=main.py
$ export FLASK_DEBUG=true
$ python3 -m flask run
```

This will launch the server and sets up a file watcher on Python files.
Unfortunately, it doesn't watch the SQL files so if you modify one of those you
have to re-run `flask run` for them to take effect.

## Deploying to Docker

```sh
$ docker build -t hg-log-analytics .
$ docker run -it --rm -p 5000:5000 hg-log-analytics
```

Visit http://localhost:5000 on Linux, 192.168.99.100:5000 on Mac.
