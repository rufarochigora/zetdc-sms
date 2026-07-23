const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

/**
 * Sends an email alert. Runs in stub/log-only mode when no SMTP
 * credentials are configured.
 */
async function sendEmail(alarm) {
  const subject = `[SMS Alert] ${alarm.severity.toUpperCase()} - ${alarm.type}`;
  const text = `${alarm.message}\n\nSite: ${alarm.siteId}\nTime: ${alarm.createdAt || new Date().toISOString()}`;

  if (!transporter || !env.ALERT_EMAIL_TO) {
    console.log(`[notifications:email:STUB] ${subject} — ${text}`);
    return { stub: true };
  }

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: env.ALERT_EMAIL_TO,
    subject,
    text,
  });
  return { stub: false, messageId: info.messageId };
}

module.exports = { sendEmail };
