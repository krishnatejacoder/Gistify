const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  gistData: { type: Object, default: null },
  fileName: { type: String },
  summaryType: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", TaskSchema);