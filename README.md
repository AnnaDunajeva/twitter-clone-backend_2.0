# Awesome Project Build with TypeORM

Steps to run this project:

1. Run `npm i` command
2. Setup database settings inside `ormconfig.json` file
3. Run `npm start` command


## Local testing with docker-compose

In project root directory:
0. docker network -d bridge cloudbuild     # once
1. docker-compose -f docker-compose.test.yaml up --build --exit-code-from test

Alternatively create test database on your machine and rename DB_HOST in env/env.test from `db` to `localhost` and run:
1. npm test

## Blackbox

To make sure we don't run into version issues we are using a fixed gnupg and blackbox versions, found in dylanmei/blackbox docker image.

`docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox`

