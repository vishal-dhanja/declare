const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require("mongoose-auto-increment");

const schema = new Schema({
  roomId: { type: Number, required: true },
  playerId: { type: Number, required: true },
  amount: { type: Number, required: true },
  roomType: { type: Number, required: true },
  isWin: { type: Boolean, default: false },
  winningAmount: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
  updated: Date,
});

schema.virtual("isVerified").get(function () {
  return !!(this.verified || this.passwordReset);
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // remove these props when object is serialized
    delete ret._id;
    delete ret.passwordHash;
  },
});
module.exports = mongoose.model("Statistic", schema);
