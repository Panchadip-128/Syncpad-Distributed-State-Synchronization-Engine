FROM node:20-alpine

WORKDIR /app

COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci

COPY apps/server/ .

EXPOSE 1234

CMD ["npm", "run", "start"]
