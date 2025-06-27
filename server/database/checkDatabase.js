import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { conf } from '../config/config.js';

const checkDatabase = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    console.log('📍 MongoDB URI:', conf.mongoUri);
    console.log('🗄️ Database Name:', conf.dbName);

    await mongoose.connect(conf.mongoUri, { dbName: conf.dbName });
    console.log('✅ Connected to database successfully');

    // Get connection details
    const db = mongoose.connection.db;
    console.log('📊 Connected to database:', db.databaseName);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📂 Collections in database:');
    if (collections.length === 0) {
      console.log('   ❌ No collections found');
    } else {
      collections.forEach((collection, index) => {
        console.log(`   ${index + 1}. ${collection.name}`);
      });
    }

    // Check User collection specifically
    console.log('\n👥 User Collection Analysis:');
    const userCount = await User.countDocuments();
    console.log(`   Total users: ${userCount}`);

    if (userCount > 0) {
      const users = await User.find({}).select('email role status createdAt');
      console.log('   Users found:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.status}`);
      });
    }

    // Check if we're in the right database by trying to list all databases
    console.log('\n🗃️ Available databases:');
    const admin = db.admin();
    const databases = await admin.listDatabases();
    databases.databases.forEach(dbInfo => {
      const marker = dbInfo.name === conf.dbName ? ' ⭐ (current)' : '';
      console.log(`   - ${dbInfo.name}${marker}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.name === 'MongoNetworkError') {
      console.log('🌐 Network issue - check your internet connection and MongoDB Atlas access');
    }
    if (err.message.includes('authentication')) {
      console.log('🔐 Authentication issue - check your username/password in the connection string');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

checkDatabase();
