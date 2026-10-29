// Compare calendar dates in Vietnam, where the booking operation takes place.
function isAtLeastOneYearOld(birthDate, now = new Date()) {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(now.getTime())) return false;
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = today.getUTCFullYear() - birth.getUTCFullYear();
  return year > 1 || (year === 1 && (today.getUTCMonth() > birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate())));
}
module.exports = { isAtLeastOneYearOld };
