#!/bin/sh
npx prisma db push --schema src/db/schema.prisma --accept-data-loss
node src/db/seed.js
exec node src/server.js