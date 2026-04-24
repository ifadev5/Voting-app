const mongoose = require('mongoose');

const nominationSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  staffName: { type: String, required: true },
  reason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Nomination', nominationSchema);