const env = require('../config/env');

let twilioClient = null;
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

/**
 * Sends an SMS alert for a critical alarm. Runs in stub/log-only mode
 * when no Twilio credentials are configured, so the rest of the system
 * (and the demo) never blocks on notification setup.
 */
async function sendSms(alarm) {
  const body = `[SMS Alert] ${alarm.severity.toUpperCase()} - ${alarm.type} - ${alarm.message}`;

  if (!twilioClient || !env.TWILIO_FROM_NUMBER || !env.ALERT_SMS_TO) {
    console.log(`[notifications:sms:STUB] ${body}`);
    return { stub: true };
  }

  const message = await twilioClient.messages.create({
    body,
    from: env.TWILIO_FROM_NUMBER,
    to: env.ALERT_SMS_TO,
  });
  return { stub: false, sid: message.sid };
}

module.exports = { sendSms };
