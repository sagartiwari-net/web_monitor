/**
 * @file db.js
 * @description MongoDB connection using Mongoose.
 *
 * Pattern: We export a function `connectDB()` that is called once
 * in server.js at startup. All models share this single connection.
 *
 * On connection failure → process exits immediately.
 * On successful connection → logs the host name.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure — no point running without DB
  }
};

module.exports = connectDB;
