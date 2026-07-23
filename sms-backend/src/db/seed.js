/**
 * Seeds:
 *  - one admin user (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  - three demo sites whose IDs (site-1, site-2, site-3) match the
 *    simulator's default SITE_IDS, each with a battery bank, two
 *    breakers, a transformer, and two relays, so the alarm rules in
 *    Section 5 have real thresholds to evaluate against from the very
 *    first simulated telemetry message.
 *
 * Run with: npm run seed  (after `npm run prisma:migrate`)
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./postgres');
const env = require('../config/env');

const DEMO_SITES = [
  { id: 'site-1', name: 'Chinamhora 33/11kV', voltageLevel: '33kV', location: 'Chinamhora, Harare' },
  { id: 'site-2', name: 'Ruwa 33/11kV', voltageLevel: '33kV', location: 'Ruwa, Mashonaland East' },
  { id: 'site-3', name: 'Bindura 33/11kV', voltageLevel: '33kV', location: 'Bindura, Mashonaland Central' },
];

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: env.SEED_ADMIN_EMAIL } });
  if (existing) {
    console.log(`[seed] admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
    return;
  }
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: { email: env.SEED_ADMIN_EMAIL, passwordHash, role: 'admin' },
  });
  console.log(`[seed] created admin user: ${env.SEED_ADMIN_EMAIL}`);
}

async function seedSites() {
  for (const site of DEMO_SITES) {
    const existing = await prisma.site.findUnique({ where: { id: site.id } });
    if (existing) {
      console.log(`[seed] site already exists: ${site.id}`);
      continue;
    }

    await prisma.site.create({
      data: {
        id: site.id,
        name: site.name,
        voltageLevel: site.voltageLevel,
        location: site.location,
        status: 'unknown',
        batteryBanks: {
          create: [{ chargerOk: true, lowVoltageThreshold: 46.0 }],
        },
        breakers: {
          create: [
            // Lowered maintenanceThreshold vs. the schema default (2000) so
            // the breaker_maintenance alarm is reachable during a live demo
            // rather than only in a multi-year production dataset.
            { label: 'HV Breaker', isClosed: true, operationCount: 0, maintenanceThreshold: 15 },
            { label: 'LV Breaker', isClosed: true, operationCount: 0, maintenanceThreshold: 15 },
          ],
        },
        transformers: {
          create: [{ label: 'T1', energized: true }],
        },
        relays: {
          create: [{ label: 'Feeder Relay 1' }, { label: 'Feeder Relay 2' }],
        },
      },
    });
    console.log(`[seed] created site: ${site.id} (${site.name})`);
  }
}

async function main() {
  await seedAdmin();
  await seedSites();
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
