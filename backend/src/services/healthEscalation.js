module.exports = async function escalate(log, req) {
  if (log.condition !== 'UNSTABLE' && !['INJURED', 'FEVER', 'DEHYDRATION'].includes(log.alertType)) return;
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await require('../controllers/incidentController').triggerSOS({
    user: req.user, app: req.app, ip: req.ip, get: req.get.bind(req),
    body: { eventId: `health:${log.eventId}`, tripId: String(log.tripId), description: `Cảnh báo sức khỏe ngựa ${log.horseId}: ${log.condition} / ${log.alertType}. ${log.notes || ''}` }
  }, response, error => { throw error; });
  if (response.code >= 400) throw Object.assign(new Error(response.body.message), { statusCode: response.code });
};
