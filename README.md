# Social app inspired by Twitter
Made with React, Redux, Styled Components, Express, PostgreSQL, Nginx and hosted on Google Cloud with continuous deployment.

Allows users to create account or login with Google credentials. Users can make posts, delete them, add pictures, like, and reply. App creates a personalized feed based on user's followings and replies to their tweets. Users can edit their profile page, search other users and follow them.

This repository contains backend source code.
- [Link to frontend](https://github.com/AnnaDunajeva/twitter-clone_2.0)
- [Link to live demo](https://twitter-frontend-4zauvs5bna-uc.a.run.app/login)
    - if you do not wish to sign up, you can use the following credentials: 
        - username: `user`
        - password: `12345`

## Setup for development
1. Run the initial setup
    ```
    git clone https://github.com/AnnaDunajeva/twitter-clone-backend_2.0 backend
    cd backend
    npm install
    ```
2. [Setup environmental variables](#environmental-variables).

3. [Setup database](#database-setup)

4. Run `npm start` command or for hot reloading `npm run start:nodemon`

## Testing <a name='testing'></a>

[Setup environmental variables](#environmental-variables).

### With docker-compose
In project root directory:
    ```
    docker-compose -f docker-compose.local-test.yaml up --build --exit-code-from test
    ```
- This will setup a container with test database and a container to run tests in (as described in `Dockerfile.test`). It runs tests once and exits if tests pass, or waits for command if tests fail.
- If you use for testing [docker-compose](#testing), set `DB_HOST` to `db`, otherwise your host.
### Directly on your machine
1. [Setup database](#database-setup)

2. run `npm test` or for interactive watch mode `npm run test:watch` 

## Production  

1. Deploying on Google Cloud:
    - Replace `gcr.io/augmented-world-276110/twitter-clone-frontend` in `cloudbuild.yaml` with path to your container registry.
        - `cloudbuild.yaml` includes instructions, that first get gnupg key from Google cloud secrets and decrypts `.env` files. Then it runs test with docker-compose. The build will fail if tests fail. Afterwards it builds container image described in `Dockerfile`. Finally it pushes container to GCR.
    - You can automate build step by setting up triggers for Github repository. Cloud build can create an image automatically, for example on each push to master branch.
    - To manually build container using cloud build:
        ```
        gcloud builds submit --config=cloudbuid.yaml
        ```
2. Build container with Docker:
    - To run tests before building a container, follow the instructions provided in [Local testing](#testing) section
    - `docker build . -t [YOUR CONTAINER NAME]`

## Setting up environmental variables <a name='environmental-variables'></a>
You would need to setup environmental variables for development, testing and production. This project assumes you have `env` folder, which contains following files:
- `dev.env`
- `prod.env`
- `test.env`

In these files, you would need to have:
- common property names and values:
    ```
    PORT=3001 # port on which server listens
    SESSION_NAME=sid # name for session id cookie
    USER_COOKIE_ID=id # name for user id cookie
    CSRF_COOKIE_KEY=XSRF-TOKEN # name for csrf token cookie
    SENDGRID_FROM_EMAIL=twitterclonetest@test.com  # displayed email adress on emails sent to users 
    COOKIE_OAUTH_VERIFICATION_TOKEN_LIFETIME=3600000 
    COOKIE_OAUTH_USER_DATA_NAME=oauth_user_data # name for cookie containing some user data recieved from Google oauth server after user succesfully signed in with google
    ```
- specific property names and values:
    - dev.env
        ```
        ENV=development 
        URL=http://localhost # from Nginx setup, described in frontend repository
        SOURCE_DIR=src
        SOURCE_EXT=ts
        ```
    - prod.env
        ```
        ENV=development 
        URL=[YOUR PUBLIC URL]
        SOURCE_DIR=dist
        SOURCE_EXT=js
        ```
    - test.env
        ```
        ENV=test
        URL=http://localhost # from Nginx setup, described in frontend repository
        SOURCE_DIR=src
        SOURCE_EXT=ts
        ```
- database related constants for TypeOrm to connect to:
    ```
    DB_HOST
    DB_PORT
    DB_USERNAME
    DB_PASSWORD
    DB_NAME
    ```
    - For more information on how to setup database refer to [database setup](#database-setup) section.
- APIs' secrets and tokens:
    - App uses [SendGrid](https://sendgrid.com/) to send emails to users (e.g accaunt verification, forgot password):
        ```
        SENDGRID_API_KEY
        ```
    - Some test use [MailSlurp](https://www.mailslurp.com/) to test email sending (disabled by default), this is optional:
        ```
        MAILSLURP_API_KEY
        ```
    - To enable signin up and logging in with Google credentials, you would need to get from [Google API console](https://console.developers.google.com/) google client id and secret. This is optional.
        ```
        GOOGLE_CLIENT_ID
        GOOGLE_CLIENT_SECRET
        ```
- other secrets:
    - This app uses `express-session` package, which requires secret to sign the session ID cookie:
        ```
        SESSION_SECRET
        ```
    - To create json web tokens, app uses `jsonwebtoken` package, which requires secret to sign token:
        ```
        JWT_TOKEN
        ```

## Database Setup <a name='database-setup'></a>

Database schema is set up on the initial connection via migrations (including the insertion of background image and default avatar).

1. Development
    - Crete a postgres database
    - Setup the following environmental variables in `dev.env` to connect to your database:
        ```
        DB_HOST
        DB_PORT
        DB_USERNAME
        DB_PASSWORD
        DB_NAME
        ```
2. Production
    This project uses CloudSQL to host postgres production database and connects to it from containers that are hosted on Cloud Run.
    - (Create a Cloud SQL instance)[https://cloud.google.com/sql/docs/postgres/quickstart-connect-run]
    - Create a SQL database on your Cloud SQL instance
    - setup environmental variables in `prod.env` file
        ```
        DB_HOST=/cloudsql/PROJECT-ID:REGION:INSTANCE-ID 
        DB_PORT
        DB_USERNAME
        DB_PASSWORD
        DB_NAME
        ```
        - (more on how to connect to Cloud SQL from Cloud Run) [https://cloud.google.com/sql/docs/postgres/connect-run]

3. Testing
If you use docker-compose for testing, you dont need to setup a database. For testing directly on your machine, you need to create a test database.

Setup environmental variables in `test.env` for TypeOrm to connect to your database:
    ```
    DB_HOST
    DB_PORT
    DB_USERNAME
    DB_PASSWORD
    DB_NAME
    ```
- If you use for testing [docker-compose](#testing):
    ```
    DB_HOST=db
    DB_PORT=5432
    DB_USERNAME=postgres
    DB_PASSWORD=1234
    DB_NAME=twitter_clone_test
    ```

## Blackbox
`.env` files are encrypted with [blackbox](https://github.com/StackExchange/blackbox). Gnupg key is stored on Google cloud secrets and is retrived from Google cloud during container building (refer to `cloudbuild.yaml`) to decrypt `.env` files.

To avoid version issues, fixed gnupg and blackbox versions are used, found in dylanmei/blackbox docker image (https://github.com/dylanmei/docker-blackbox, https://hub.docker.com/r/dylanmei/blackbox/).

To use it prefix all your `gpg` and `blackbox_*` operations with:

`docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox <your-command>`

e.g.:

```
docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox blackbox_decrypt_all_files
docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox blackbox_edit_end env/test.env
docker run --rm -t -v $YOUR_LOCAL_GNUPG_DIR:/gnupg -v $(pwd):/repo dylanmei/blackbox blackbox_shred_all_files
```



# Todos
- Remove non-cloud deployment description: it is literally just docker building instruction
