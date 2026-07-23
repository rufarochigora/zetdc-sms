const prisma = require('../../db/postgres');

/** GET /api/alarms?state=&siteId= */
async function listAlarms(req, res) {
  const { state, siteId } = req.query;
  const where = {};
  if (state) where.state = state;
  if (siteId) where.siteId = siteId;

  const alarms = await prisma.alarm.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(alarms);
}

/** POST /api/alarms/:id/acknowledge */
async function acknowledgeAlarm(req, res) {
  const alarm = await prisma.alarm.findUnique({ where: { id: req.params.id } });
  if (!alarm) return res.status(404).json({ error: 'Alarm not found' });

  const updated = await prisma.alarm.update({
    where: { id: req.params.id },
    data: {
      state: 'acknowledged',
      acknowledgedBy: req.user.email,
      acknowledgedAt: new Date(),
    },
  });

  req.app.get('io').to(`site:${updated.siteId}`).emit('alarm:updated', {
    id: updated.id,
    state: updated.state,
    acknowledgedBy: updated.acknowledgedBy,
  });

  res.json(updated);
}

/** POST /api/alarms/:id/clear */
async function clearAlarm(req, res) {
  const alarm = await prisma.alarm.findUnique({ where: { id: req.params.id } });
  if (!alarm) return res.status(404).json({ error: 'Alarm not found' });

  const updated = await prisma.alarm.update({
    where: { id: req.params.id },
    data: { state: 'cleared' },
  });

  req.app.get('io').to(`site:${updated.siteId}`).emit('alarm:updated', {
    id: updated.id,
    state: updated.state,
    acknowledgedBy: updated.acknowledgedBy,
  });

  res.json(updated);
}

module.exports = { listAlarms, acknowledgeAlarm, clearAlarm };
