require('dotenv').config();

function bool(val, fallback = false) {
  if (val === undefined || val === null || val === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
}

const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  DATABASE_URL: process.env.DATABASE_URL,

  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',

  MQTT_URL: process.env.MQTT_URL || 'mqtt://localhost:1883',
  SITE_OFFLINE_TIMEOUT_MS: parseInt(process.env.SITE_OFFLINE_TIMEOUT_MS || '120000', 10),

  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@sms.local',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'admin123',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || '',
  ALERT_SMS_TO: process.env.ALERT_SMS_TO || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM: process.env.SMTP_FROM || 'alerts@sms.local',
  ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO || '',

  SIM_SITE_COUNT: parseInt(process.env.SIM_SITE_COUNT || '3', 10),
  SIM_INTERVAL_MS: parseInt(process.env.SIM_INTERVAL_MS || '7000', 10),

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

module.exports = env;
module.exports.bool = bool;
