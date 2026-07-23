# This image is for local `docker compose up` only, running Vite's dev
# server. For production, the frontend is built as a static site and
# deployed to Vercel instead (see SETUP.md) - Vercel builds directly from
# the repo and doesn't use this Dockerfile at all.

FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
