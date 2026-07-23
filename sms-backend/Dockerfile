FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema src/db/schema.prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
