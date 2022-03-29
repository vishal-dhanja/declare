const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require("mongoose-auto-increment");

const schema = new Schema({
  playerId: { type: Number, unique: true, required: true },
  loginType: { type: String, required: true },
  socketId: { type: String },
  isNewUser: { type: Boolean },
  fbUserId: { type: String },
  fbUserToken: { type: String },
  playerName: { type: String },
  profilePictureId: { type: String },
  chips: { type: Number, default: 1000 },
  level: { type: Number, default: 1 },
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
autoIncrement.initialize(mongoose.connection);
schema.plugin(autoIncrement.plugin, {
  model: "Account",
  field: "playerId",
});

module.exports = mongoose.model("Account", schema);
