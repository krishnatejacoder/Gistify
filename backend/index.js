require('dotenv').config(); // Load all environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const methodOverride = require('method-override');
const fileRoutes = require('./routes/fileRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const authRoutes = require('./routes/authRoutes');
const gistRoutes = require('./routes/gistRoutes');
const authenticateToken = require('./middleware/auth');
// require("./utils/cleanupTasks");

const app = express();

// Middleware
// app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173', // your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Routes
app.use('/files', authenticateToken, fileRoutes);
app.use('/summary', authenticateToken, summaryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gists', authenticateToken, gistRoutes);
// app.use("/api/tasks", require("./routes/tasks"));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};
connectDB();

// Base Route
app.get('/', (req, res) => {
  res.send('<h1>HOME ROUTE</h1>');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
