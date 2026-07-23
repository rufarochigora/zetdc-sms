const mqtt = require('mqtt');
const env = require('../config/env');

/**
 * Connects to the broker and subscribes to every site's telemetry, event,
 * and status topics via wildcards - "add a site = add a topic", no backend
 * config change needed when a new substation gateway comes online.
 *
 * onMessage(topic, payloadObject) is called for every parsed message.
 */
function connectMqtt(onMessage) {
  const client = mqtt.connect(env.MQTT_URL, {
    clientId: `sms-backend-${Math.random().toString(16).slice(2)}`,
    reconnectPeriod: 2000,
  });

  client.on('connect', () => {
    console.log(`[mqtt] connected to ${env.MQTT_URL}`);
    client.subscribe('sms/+/telemetry', { qos: 0 });
    client.subscribe('sms/+/event', { qos: 1 });
    client.subscribe('sms/+/status', { qos: 1 });
  });

  client.on('reconnect', () => console.log('[mqtt] reconnecting...'));
  client.on('error', (err) => console.error('[mqtt] error', err.message));

  client.on('message', (topic, buffer) => {
    const parts = topic.split('/'); // ["sms", siteId, kind]
    if (parts.length !== 3 || parts[0] !== 'sms') return;
    const [, siteId, kind] = parts;

    let payload;
    try {
      payload = JSON.parse(buffer.toString());
    } catch (err) {
      console.error(`[mqtt] invalid JSON on ${topic}:`, err.message);
      return;
    }

    onMessage({ siteId, kind, payload, topic });
  });

  return client;
}

module.exports = { connectMqtt };
