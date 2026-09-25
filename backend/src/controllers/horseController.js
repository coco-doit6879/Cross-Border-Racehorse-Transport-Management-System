const Horse = require('../models/Horse');
const HorseFile = require('../models/HorseFile');
const { logAudit } = require('../utils/auditLogger');
const { pickProfile, validateProfile } = require('../utils/horseProfile');

const canManage = (user) => user.effectivePermissions?.includes('horse:manage_all');
const canReview = (user) => user.effectivePermissions?.includes('horse:review_health');
const ownerId = (horse) => String(horse.ownerId?._id || horse.ownerId);
const canRead = (user, horse) => canManage(user) || canReview(user) || ownerId(horse) === String(user._id);
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const audit = (req, horse, action) => logAudit({ actorId: req.user._id, action, resource: 'Horse', resourceId: String(horse._id), result: 'SUCCESS', ipAddress: req.ip, userAgent: req.get('User-Agent') });

async function validateFiles(profile, allowedOwners) {
  const refs = [...profile.photos, profile.passportScanUrl, profile.vaccinationRecordUrl];
  for (let i = 0; i < refs.length; i++) {
    const match = typeof refs[i] === 'string' && refs[i].match(/^\/horses\/files\/([a-f0-9]{24})$/i);
    if (!match) return 'Vui lòng tải lên đầy đủ ảnh và giấy tờ thật.';
    const file = await HorseFile.findById(match[1]);
    if (!file || !allowedOwners.includes(String(file.ownerId))) return 'Tệp không tồn tại hoặc không thuộc hồ sơ của bạn.';
    if (i < 2 && !file.mimeType.startsWith('image/')) return 'Ảnh nhận dạng phải là JPG hoặc PNG.';
  }
  return null;
}

exports.getHorses = async (req, res, next) => {
  try {
    const query = canManage(req.user) || canReview(req.user) ? {} : { ownerId: req.user._id };
    if ((canManage(req.user) || canReview(req.user)) && req.query.ownerId) query.ownerId = req.query.ownerId;
    const horses = await Horse.find(query).populate('ownerId', 'fullName email').sort({ createdAt: -1 });
    res.json({ success: true, data: horses, count: horses.length });
  } catch (error) { next(error); }
};

exports.getHorseById = async (req, res, next) => {
  try {
    const horse = await Horse.findById(req.params.id).populate('ownerId', 'fullName email').populate('reviewedBy', 'fullName');
    if (!horse) return fail(res, 404, 'Không tìm thấy hồ sơ ngựa.');
    if (!canRead(req.user, horse)) return fail(res, 403, 'Bạn không có quyền xem hồ sơ này.');
    res.json({ success: true, data: horse });
  } catch (error) { next(error); }
};

exports.createHorse = async (req, res, next) => {
  try {
    const profile = pickProfile(req.body);
    const invalid = validateProfile(profile);
    if (invalid) return fail(res, 400, invalid);
    const fileError = await validateFiles(profile, [String(req.user._id)]);
    if (fileError) return fail(res, 400, fileError);
    const horse = await Horse.create({ ...profile, ownerId: req.user._id, reviewStatus: 'PENDING_REVIEW' });
    await audit(req, horse, 'HORSE_CREATE');
    res.status(201).json({ success: true, data: horse });
  } catch (error) { next(error); }
};

exports.updateHorse = async (req, res, next) => {
  try {
    const horse = await Horse.findById(req.params.id);
    if (!horse) return fail(res, 404, 'Không tìm thấy hồ sơ ngựa.');
    if (ownerId(horse) !== String(req.user._id)) return fail(res, 403, 'Chỉ chủ ngựa được sửa hồ sơ và gửi lại kiểm duyệt.');
    const changes = pickProfile(req.body);
    const profile = { ...horse.toObject(), ...changes };
    const invalid = validateProfile(profile);
    if (invalid) return fail(res, 400, invalid);
    const fileError = await validateFiles(profile, [String(req.user._id), ownerId(horse)]);
    if (fileError) return fail(res, 400, fileError);
    const updated = await Horse.findOneAndUpdate({ _id: horse._id, __v: horse.__v }, {
      $set: { ...changes, reviewStatus: 'PENDING_REVIEW' },
      $unset: { reviewedBy: 1, reviewedAt: 1, reviewNotes: 1 },
      $inc: { __v: 1 }
    }, { new: true, runValidators: true });
    if (!updated) return fail(res, 409, 'Hồ sơ đã thay đổi. Vui lòng tải lại.');
    await audit(req, updated, 'HORSE_UPDATE');
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

exports.reviewHorse = async (req, res, next) => {
  try {
    if (!canReview(req.user)) return fail(res, 403, 'Bạn không có quyền kiểm duyệt sức khỏe.');
    const horse = await Horse.findById(req.params.id);
    if (!horse) return fail(res, 404, 'Không tìm thấy hồ sơ ngựa.');
    if (ownerId(horse) === String(req.user._id)) return fail(res, 403, 'Không thể tự kiểm duyệt ngựa của mình.');
    const { decision, notes, profileVersion } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) return fail(res, 400, 'Quyết định kiểm duyệt không hợp lệ.');
    if (typeof notes !== 'string' || !notes.trim()) return fail(res, 400, 'Vui lòng nhập kết luận sức khỏe hoặc lý do từ chối.');
    if (!Number.isInteger(profileVersion) || horse.__v !== profileVersion || horse.reviewStatus !== 'PENDING_REVIEW') return fail(res, 409, 'Hồ sơ đã thay đổi hoặc đã được duyệt. Vui lòng tải lại.');
    if (decision === 'APPROVED') {
      const invalid = validateProfile(horse.toObject());
      if (invalid) return fail(res, 400, invalid);
      const fileError = await validateFiles(horse, [ownerId(horse), String(req.user._id)]);
      if (fileError) return fail(res, 400, fileError);
      const cutoff = new Date();
      cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
      cutoff.setUTCHours(0, 0, 0, 0);
      if (new Date(horse.lastVaccinationDate) < cutoff) return fail(res, 400, 'Hồ sơ tiêm phòng cúm ngựa đã quá 6 tháng. Vui lòng yêu cầu chủ ngựa bổ sung.');
    }
    const reviewedAt = new Date();
    const updated = await Horse.findOneAndUpdate({ _id: horse._id, __v: profileVersion, reviewStatus: 'PENDING_REVIEW' }, {
      $set: { reviewStatus: decision, reviewedBy: req.user._id, reviewedAt, reviewNotes: notes.trim() },
      $push: { reviewHistory: { decision, reviewerId: req.user._id, reviewedAt, notes: notes.trim(), profileVersion } },
      $inc: { __v: 1 }
    }, { new: true, runValidators: true });
    if (!updated) return fail(res, 409, 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi duyệt.');
    await audit(req, updated, `HORSE_HEALTH_${decision}`);
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    const data = req.body;
    const mimeType = req.get('Content-Type')?.split(';')[0];
    const signatures = {
      'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
      'application/pdf': (b) => b.subarray(0, 5).toString() === '%PDF-'
    };
    if (!Buffer.isBuffer(data) || !data.length || data.length > 5 * 1024 * 1024 || !signatures[mimeType]?.(data)) return fail(res, 400, 'Chỉ nhận JPG, PNG hoặc PDF hợp lệ, tối đa 5 MB mỗi tệp.');
    let name;
    try { name = decodeURIComponent(req.get('X-File-Name') || 'document'); } catch { return fail(res, 400, 'Tên tệp không hợp lệ.'); }
    const file = await HorseFile.create({ ownerId: req.user._id, name: name.slice(0, 200), mimeType, data, size: data.length });
    res.status(201).json({ success: true, data: { url: `/horses/files/${file._id}`, name: file.name, size: file.size } });
  } catch (error) { next(error); }
};

exports.getFile = async (req, res, next) => {
  try {
    const file = await HorseFile.findById(req.params.fileId).select('+data');
    if (!file) return fail(res, 404, 'Không tìm thấy tệp.');
    if (String(file.ownerId) !== String(req.user._id) && !canManage(req.user) && !canReview(req.user)) return fail(res, 403, 'Bạn không có quyền xem tệp này.');
    res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
    res.send(file.data);
  } catch (error) { next(error); }
};
