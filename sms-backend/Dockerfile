FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema src/db/schema.prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
