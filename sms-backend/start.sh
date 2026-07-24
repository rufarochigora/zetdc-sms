#!/bin/sh
npx prisma migrate deploy --schema src/db/schema.prisma
exec node src/server.js