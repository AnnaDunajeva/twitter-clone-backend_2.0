# Twitter-clone Backend

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

To make sure we don't run into version issues we are using a fixed gnupg and blackbox versions, found in dylanmei/blackbox docker image (https://github.com/dylanmei/docker-blackbox, https://github.com/dylanmei/docker-blackbox).

To use it prefix all your `gpg` and `blackbox_*` operations with:

```docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox <your-command>```

e.g.:

```docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox blackbox_decrypt_all_files```

```docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox blackbox_edit_end env/test.env```







