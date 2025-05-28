const express = require("express");
const router = express.Router();
const Task = require("../models/Task");

router.get("/api/tasks/:taskId", async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;