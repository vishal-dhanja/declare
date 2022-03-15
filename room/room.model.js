const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');

const schema = new Schema({
    roomId: { type: Number, unique: true, required: true, default: 1000 },
    playerId: { type: Number, required: true },
    amount: { type: Number, required: true },
    created: { type: Date, default: Date.now },
    updated: Date
});

schema.virtual('isVerified').get(function () {
    return !!(this.verified || this.passwordReset);
});

schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        // remove these props when object is serialized
        delete ret._id;
        delete ret.passwordHash;
    }
});
autoIncrement.initialize(mongoose.connection);
schema.plugin(autoIncrement.plugin, {
    model: 'Rooms',
    field: 'roomId'
});

module.exports = mongoose.model('Room', schema);