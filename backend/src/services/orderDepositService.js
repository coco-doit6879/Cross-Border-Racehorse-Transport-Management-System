const DEFAULT_DEPOSIT_PERCENT = 20;
const DEFAULT_DEPOSIT_WINDOW_MINUTES = 30;

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function getPolicy() {
  return {
    percent: boundedInteger(process.env.ORDER_DEPOSIT_PERCENT, DEFAULT_DEPOSIT_PERCENT, 1, 100),
    windowMinutes: boundedInteger(process.env.ORDER_DEPOSIT_WINDOW_MINUTES, DEFAULT_DEPOSIT_WINDOW_MINUTES, 5, 1440)
  };
}

function calculateDeposit(totalAmountVnd) {
  if (!Number.isSafeInteger(totalAmountVnd) || totalAmountVnd <= 0) throw new Error('Tổng tiền đơn hàng không hợp lệ.');
  const { percent } = getPolicy();
  return Math.min(totalAmountVnd, Math.ceil((totalAmountVnd * percent / 100) / 1000) * 1000);
}

function depositDueAt(now = new Date()) {
  return new Date(now.getTime() + getPolicy().windowMinutes * 60 * 1000);
}

module.exports = { calculateDeposit, depositDueAt, getPolicy, DEFAULT_DEPOSIT_PERCENT, DEFAULT_DEPOSIT_WINDOW_MINUTES };
