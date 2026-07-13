const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoUri, isProduction } = require('./config/env');

let mongoServer;

async function connectDB() {
  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected.');
      return;
    }

    if (isProduction) {
      throw new Error('MONGODB_URI must be configured in production.');
    }

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.warn('Using an ephemeral in-memory MongoDB instance for development.');
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

module.exports = { connectDB, closeDB };
