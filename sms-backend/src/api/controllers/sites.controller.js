const prisma = require('../../db/postgres');

/** GET /api/sites - list all sites with current status summary */
async function listSites(req, res) {
  const sites = await prisma.site.findMany({
    orderBy: { name: 'asc' },
  });

  // Attach a "worst active alarm severity" summary per site so the
  // frontend can color-code SubstationCards without a second round trip.
  const openAlarms = await prisma.alarm.findMany({
    where: { state: { in: ['new', 'acknowledged'] } },
    select: { siteId: true, severity: true },
  });

  const severityRank = { critical: 3, warning: 2, info: 1 };
  const worstBySite = {};
  for (const alarm of openAlarms) {
    const rank = severityRank[alarm.severity] || 0;
    if (!worstBySite[alarm.siteId] || rank > severityRank[worstBySite[alarm.siteId]]) {
      worstBySite[alarm.siteId] = alarm.severity;
    }
  }

  res.json(
    sites.map((site) => ({
      ...site,
      worstActiveAlarmSeverity: worstBySite[site.id] || null,
    }))
  );
}

/** GET /api/sites/:id - full detail */
async function getSite(req, res) {
  const site = await prisma.site.findUnique({
    where: { id: req.params.id },
    include: {
      breakers: true,
      batteryBanks: true,
      transformers: true,
      relays: true,
    },
  });

  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site);
}

module.exports = { listSites, getSite };
