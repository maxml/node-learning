# syntax=docker/dockerfile:1
# Dev image: dependencies are installed INTO the image at /app/node_modules.
FROM node:24-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
USER node
CMD ["node", "src/index.js"]
