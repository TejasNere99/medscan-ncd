import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-smart-healthcare');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Initial Connection Error: ${error.message}`);
    // If in development/testing without running MongoDB daemon, do not crash process instantly
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
