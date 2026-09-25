const FIELDS = ['name', 'microchipId', 'feiPassportNumber', 'breed', 'dateOfBirth',
  'gender', 'weightKg', 'color', 'identifyingMarks', 'photos', 'passportScanUrl',
  'vaccinationRecordUrl', 'lastVaccinationDate', 'medicalHistoryNotes'];

const pickProfile = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined)
  .map((key) => [key, typeof body[key] === 'string' ? body[key].trim() : body[key]]));

function validateProfile(profile) {
  for (const key of ['name', 'microchipId', 'feiPassportNumber', 'breed', 'gender', 'color', 'passportScanUrl', 'vaccinationRecordUrl']) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) return `Thiếu thông tin bắt buộc: ${key}`;
  }
  if (!/^[A-Za-z0-9]{10,18}$/.test(profile.microchipId)) return 'Mã chip phải có 10–18 ký tự chữ hoặc số.';
  if (!['STALLION', 'MARE', 'GELDING'].includes(profile.gender)) return 'Giới tính không hợp lệ.';
  if (!Number.isFinite(Number(profile.weightKg)) || Number(profile.weightKg) <= 0) return 'Cân nặng phải lớn hơn 0.';
  for (const key of ['dateOfBirth', 'lastVaccinationDate']) {
    const date = new Date(profile[key]);
    if (!profile[key] || !Number.isFinite(date.getTime()) || date > new Date()) return 'Ngày sinh và ngày tiêm chủng phải hợp lệ, không ở tương lai.';
  }
  if (new Date(profile.lastVaccinationDate) < new Date(profile.dateOfBirth)) return 'Ngày tiêm chủng không được trước ngày sinh.';
  if (!Array.isArray(profile.photos) || profile.photos.length !== 2 || new Set(profile.photos).size !== 2) return 'Cần hai ảnh riêng: toàn thân và khuôn mặt.';
  return null;
}

module.exports = { pickProfile, validateProfile };
