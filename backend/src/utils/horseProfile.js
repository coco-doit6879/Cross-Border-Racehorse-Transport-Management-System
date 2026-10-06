const FIELDS = ['name', 'microchipId', 'feiPassportNumber', 'breed', 'dateOfBirth',
  'gender', 'weightKg', 'color', 'identifyingMarks', 'photos', 'passportScanUrl',
  'vaccinationRecordUrl', 'lastVaccinationDate', 'medicalHistoryNotes', 'currentStopId'];

const { STOPS } = require('../config/transportCatalog');

const pickProfile = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined)
  .map((key) => [key, typeof body[key] === 'string' ? body[key].trim() : body[key]]));

function validateProfile(profile) {
  for (const key of ['name', 'microchipId', 'feiPassportNumber', 'breed', 'gender', 'color', 'currentStopId']) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) return `Thiếu thông tin bắt buộc: ${key}`;
  }
  if (!/^[A-Za-z0-9]{10,18}$/.test(profile.microchipId)) return 'Mã chip phải có 10–18 ký tự chữ hoặc số.';
  if (!['STALLION', 'MARE', 'GELDING'].includes(profile.gender)) return 'Giới tính không hợp lệ.';
  if (!STOPS.some((stop) => stop.id === profile.currentStopId)) return 'Địa điểm hiện tại của ngựa không thuộc danh sách điểm vận chuyển cố định.';
  if (!Number.isFinite(Number(profile.weightKg)) || Number(profile.weightKg) <= 0) return 'Cân nặng phải lớn hơn 0.';
  for (const key of ['dateOfBirth', 'lastVaccinationDate']) {
    const date = new Date(profile[key]);
    if (!profile[key] || !Number.isFinite(date.getTime()) || date > new Date()) return 'Ngày sinh và ngày tiêm chủng phải hợp lệ, không ở tương lai.';
  }
  if (new Date(profile.lastVaccinationDate) < new Date(profile.dateOfBirth)) return 'Ngày tiêm chủng không được trước ngày sinh.';
  if (!Array.isArray(profile.photos) || profile.photos.length < 2 || profile.photos.length > 10 || new Set(profile.photos).size !== profile.photos.length) return 'Cần từ 2 đến 10 ảnh ngựa riêng biệt.';
  for (const key of ['passportScanUrl', 'vaccinationRecordUrl']) {
    const files = Array.isArray(profile[key]) ? profile[key] : [profile[key]];
    if (files.length < 1 || files.length > 10 || files.some((file) => typeof file !== 'string' || !file.trim()) || new Set(files).size !== files.length) return `Cần từ 1 đến 10 tệp hợp lệ cho ${key}.`;
  }
  return null;
}

module.exports = { pickProfile, validateProfile };
