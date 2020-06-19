FROM node:13.7 as build
WORKDIR /source
COPY . ./
RUN npm ci
RUN npm run build

EXPOSE 3001
CMD [ "npm", "run", "prod" ]

