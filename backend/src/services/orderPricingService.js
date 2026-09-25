const { ADD_ONS, CURRENCY } = require('../config/transportCatalog');

const pricingError = (message) => Object.assign(new Error(message), { status: 400 });

function calculatePricing({ basePriceVnd, horseCount, addOnIds = [] }) {
  if (!Number.isSafeInteger(basePriceVnd) || basePriceVnd <= 0) throw pricingError('Tuyến vận chuyển chưa có giá hợp lệ.');
  if (!Number.isInteger(horseCount) || horseCount <= 0) throw pricingError('Số lượng ngựa không hợp lệ.');
  if (!Array.isArray(addOnIds) || new Set(addOnIds).size !== addOnIds.length) throw pricingError('Danh sách dịch vụ cộng thêm không hợp lệ.');

  const selectedAddOns = addOnIds.map((id) => {
    const addOn = ADD_ONS.find((item) => item.id === id);
    if (!addOn) throw pricingError('Có dịch vụ cộng thêm không còn được cung cấp.');
    const quantity = addOn.pricingMode === 'PER_HORSE' ? horseCount : 1;
    return { ...addOn, quantity, amountVnd: addOn.unitPriceVnd * quantity };
  });
  const baseAmountVnd = basePriceVnd * horseCount;
  const addOnsAmountVnd = selectedAddOns.reduce((sum, item) => sum + item.amountVnd, 0);

  return {
    currency: CURRENCY,
    routeBaseUnitPriceVnd: basePriceVnd,
    horseCount,
    baseAmountVnd,
    addOns: selectedAddOns,
    addOnsAmountVnd,
    totalAmountVnd: baseAmountVnd + addOnsAmountVnd
  };
}

module.exports = { calculatePricing };
