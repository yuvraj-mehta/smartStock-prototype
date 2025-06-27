import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { conf } from '../config/config.js';

const deleteAdmin = async () => {
  try {
    await mongoose.connect(conf.mongoUri, { dbName: conf.dbName });
    console.log('✅ Connected to database');

    const result = await User.deleteOne({ email: 'admin@example.com' });

    if (result.deletedCount > 0) {
      console.log('🗑️ Admin user deleted successfully');
    } else {
      console.log('❌ No admin user found to delete');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

deleteAdmin();
