FROM alpine:3.6
RUN apk add --no-cache gcc musl-dev openssl-dev python3-dev
RUN pip3 install flask scrypt
COPY LogParser /app/LogParser/
COPY static /app/static/
COPY templates /app/templates/
COPY main.py database.py schema.sql starter_confirmations.sql /app/
WORKDIR /app/
ENV FLASK_APP=main.py FLASK_DEBUG=true
EXPOSE 5000
ENTRYPOINT ["/usr/bin/python3", "-m", "flask", "run", "--host=0.0.0.0"]
