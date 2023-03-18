const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Creat Schema
const ProfileSchema = new Schema({
  fromPosition: {
    type: String,
  },
  lane: {
    type: Number,
  },
  carSize: {
    type: String,
  },
  carModel: {
    type: String,
  },
  color: {
    type: String,
  },
  licensePlateNumber: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now
  }
})
const Profiles = mongoose.model("profiles", ProfileSchema);
module.exports = Profiles;