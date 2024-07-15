########################################################################
# Base setup
########################################################################
FROM node:22 AS base

WORKDIR /app
COPY tsconfig*.json ./package*.json ./
COPY ./packages/shared ./packages/shared

RUN npm i --no-audit --no-fund \
 && npm run build:shared

########################################################################
# Build server backend
########################################################################
FROM base AS build-server

COPY ./packages/server/package*.json ./packages/server/
RUN npm i --no-audit --no-fund

COPY ./packages/server ./packages/server
RUN npm run build:server

########################################################################
# Build web frontend
########################################################################
FROM base AS build-web

COPY ./packages/coordinator/package*.json ./packages/coordinator/
RUN npm i --no-audit --no-fund

COPY ./packages/coordinator ./packages/coordinator
RUN npm run build:web

########################################################################
# Build actual runtime image
########################################################################
FROM base AS runner

COPY --from=build-server /app/packages/server ./packages/server
COPY --from=build-web /app/packages/server/html ./packages/server/html
RUN npm i --omit dev --no-audit --no-fund

COPY ./server-config.base.json ./

EXPOSE 8090:8090
CMD ["npm", "run", "start:server"]
