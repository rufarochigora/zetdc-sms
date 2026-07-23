const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

// Single shared Prisma client instance for the whole process.
// TimescaleDB runs as an extension on this same Postgres instance,
// so Prisma talks to it exactly like plain Postgres - the `readings`
// hypertable conversion is handled in the migration SQL, not here.
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
