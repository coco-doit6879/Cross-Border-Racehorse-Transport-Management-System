// Unique indexes arbitrate concurrent reservations in the database.
module.exports = function reservationState(schema, terminal, keys) {
  schema.add({ activeReservation: { type: Boolean, default: true } });
  for (const key of keys) schema.index({ [key]: 1 }, { unique: true, partialFilterExpression: { activeReservation: true }, name: `active_${key}_reservation` });
  schema.pre('validate', function () { this.activeReservation = !terminal.includes(this.status); });
  for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate']) schema.pre(operation, function () {
    const update = this.getUpdate();
    const status = update?.$set?.status || update?.status;
    if (status) {
      update.$set ||= {};
      update.$set.activeReservation = !terminal.includes(status);
    }
  });
};
