const Horse = require('../models/Horse');

async function moveOrderHorsesToDestination(order) {
  if (!order?.destinationStopId || !Array.isArray(order.horseIds) || order.horseIds.length === 0) return;
  await Horse.updateMany(
    { _id: { $in: order.horseIds } },
    { $set: { currentStopId: order.destinationStopId } }
  );
}

module.exports = { moveOrderHorsesToDestination };
