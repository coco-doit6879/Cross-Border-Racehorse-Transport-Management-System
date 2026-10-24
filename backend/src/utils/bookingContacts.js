const fields = { fullName: 120, phone: 30, area: 100, address: 300, identityNumber: 50 };

function normalizeBookingContacts(value) {
  if (value === undefined) return undefined;
  const bad = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('Thông tin giao nhận không hợp lệ.');
  const result = {};
  for (const side of ['sender', 'recipient']) {
    const contact = value[side];
    if (!contact || typeof contact !== 'object' || Array.isArray(contact)) bad('Vui lòng nhập đầy đủ người gửi và người nhận.');
    result[side] = {};
    for (const [field, max] of Object.entries(fields)) {
      if (typeof contact[field] !== 'string' || !contact[field].trim() || contact[field].trim().length > max) bad('Vui lòng kiểm tra họ tên, số điện thoại, địa chỉ và giấy tờ người gửi/nhận.');
      result[side][field] = contact[field].trim();
    }
    if (!/^\+?[0-9 ()-]{6,30}$/.test(result[side].phone)) bad('Số điện thoại người gửi/nhận không hợp lệ.');
  }
  return result;
}
module.exports = { normalizeBookingContacts };
