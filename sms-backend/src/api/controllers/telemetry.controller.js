const prisma = require('../../db/postgres');

/** GET /api/sites/:id/readings?metric=&from=&to= */
async function getReadings(req, res) {
  const { id: siteId } = req.params;
  const { metric, from, to } = req.query;

  if (!metric) {
    return res.status(400).json({ error: 'metric query param is required' });
  }

  const where = { siteId, metric };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  const readings = await prisma.reading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: 5000, // pilot-scale safety cap
  });

  // BigInt ids don't serialize to JSON by default.
  res.json(
    readings.map((r) => ({
      id: r.id.toString(),
      metric: r.metric,
      value: r.value,
      timestamp: r.timestamp,
    }))
  );
}

module.exports = { getReadings };
