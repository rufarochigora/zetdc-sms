const prisma = require('../../db/postgres');

/** GET /api/reports/breaker-operations?siteId= */
async function breakerOperationsReport(req, res) {
  const { siteId } = req.query;
  const where = siteId ? { siteId } : {};

  const breakers = await prisma.breaker.findMany({
    where,
    include: { site: { select: { name: true } } },
    orderBy: [{ siteId: 'asc' }, { label: 'asc' }],
  });

  res.json(
    breakers.map((b) => ({
      siteId: b.siteId,
      siteName: b.site.name,
      breakerId: b.id,
      label: b.label,
      operationCount: b.operationCount,
      maintenanceThreshold: b.maintenanceThreshold,
      percentToMaintenance: Math.min(100, Math.round((b.operationCount / b.maintenanceThreshold) * 100)),
      maintenanceDue: b.operationCount >= b.maintenanceThreshold,
    }))
  );
}

module.exports = { breakerOperationsReport };
