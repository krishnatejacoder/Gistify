require('dotenv').config();
const express = require('express');
const app = express();
const router = express.Router();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const PORT = 5000;
const fileRoutes = require('./routes/fileRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const multer = require('multer');
const {storage} = require('./cloudinary/index')

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method')); 

app.use('/files', fileRoutes);
app.use('/summary', summaryRoutes);

const connectDB = async () => {
    try {
      await mongoose.connect("mongodb://localhost:27017/gistifyDB", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ MongoDB connected successfully");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      process.exit(1); // Exit process if connection fails
    }
  };
  
connectDB();

app.get('/', (req,res)=>{
    res.send('<h1>HOME ROUTE</h1>')
})

app.listen(PORT, () =>{
    console.log(`ON PORT ${PORT}`);
    
})