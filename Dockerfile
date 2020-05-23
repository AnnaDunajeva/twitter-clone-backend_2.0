FROM node:13.7 as build
WORKDIR /source
COPY . ./
RUN npm install
RUN npm run build

# FROM node:13.7
# WORKDIR /app
# # Copy local code to the container image.\

# COPY package*.json ./

# COPY --from=build /source/node_modules ./node_modules
# COPY --from=build /source/env ./env
# COPY --from=build /source/assets ./assets
# COPY --from=build /source/dist ./dist


EXPOSE 3001
CMD [ "npm", "run", "prod" ]

