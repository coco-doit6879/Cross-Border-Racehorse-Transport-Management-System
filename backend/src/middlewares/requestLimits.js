// Per-process protection. Deployments with multiple replicas must also enforce
// limits at their shared gateway; this map is bounded and expires old entries.
const entries = new Map();
module.exports = (limit, windowMs) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.ip}:${req.baseUrl}:${req.path}`;
  if (entries.size > 10000) for (const [id, item] of entries) if (item.until < now) entries.delete(id);
  if (!entries.has(key) && entries.size >= 20000) return res.status(503).json({ message: 'Hệ thống bận. Vui lòng thử lại.' });
  let entry = entries.get(key);
  if (!entry || entry.until <= now) { entry = { count: 0, until: now + windowMs }; entries.set(key, entry); }
  if (++entry.count > limit) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }); }
  next();
};
