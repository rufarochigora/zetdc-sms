#!/bin/sh
npx prisma db push --schema src/db/schema.prisma --accept-data-loss
exec node src/server.js