const http = require('http');
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const { createSocketServer } = require('./ws/socket');
const { startIngestion } = require('./mqtt/ingest');

const authRoutes = require('./api/routes/auth.routes');
const sitesRoutes = require('./api/routes/sites.routes');
const telemetryRoutes = require('./api/routes/telemetry.routes');
const alarmsRoutes = require('./api/routes/alarms.routes');
const reportsRoutes = require('./api/routes/reports.routes');

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/sites', telemetryRoutes); // adds GET /api/sites/:id/readings
app.use('/api/alarms', alarmsRoutes);
app.use('/api/reports', reportsRoutes);

// Fallback error handler so a thrown/rejected controller doesn't crash the process.
app.use((err, req, res, next) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);
app.set('io', io); // so controllers (e.g. alarms.controller) can emit without a circular import

startIngestion(io);

httpServer.listen(env.PORT, () => {
  console.log(`[server] SMS backend listening on :${env.PORT} (${env.NODE_ENV})`);
});
