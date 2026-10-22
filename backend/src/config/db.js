import mongoose from 'mongoose';
import { runRelationshipMigration } from '../utils/relationshipMigration.js';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (process.env.NODE_ENV === 'production' && !mongoUri) {
      console.error('[MongoDB Error] MONGODB_URI environment variable is missing in production.');
      console.error('Please configure your MongoDB Atlas connection string in your hosting dashboard.');
      process.exit(1);
    }
    const uri = mongoUri || 'mongodb://127.0.0.1:27017/ai-smart-healthcare';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    // Run idempotent relationship migration to synchronize legacy fields
    await runRelationshipMigration();
  } catch (error) {
    console.error(`[MongoDB] Initial Connection Error: ${error.message}`);
    // If in development/testing without running MongoDB daemon, do not crash process instantly
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
