const Task = require("../models/Task");

const cleanupOldTasks = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Task.deleteMany({ createdAt: { $lt: oneDayAgo } });
    console.log("Cleaned up old tasks");
  } catch (err) {
    console.error("Error cleaning up tasks:", err);
  }
};

// Run cleanup every hour
setInterval(cleanupOldTasks, 60 * 60 * 1000);

module.exports = cleanupOldTasks;