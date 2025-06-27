import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { conf } from '../config/config.js';

const checkAdmin = async () => {
  try {
    await mongoose.connect(conf.mongoUri, { dbName: conf.dbName });
    console.log('✅ Connected to database');

    const admin = await User.findOne({ email: 'admin@example.com' });
    if (admin) {
      console.log('🔍 Admin found:', {
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        emailVerified: admin.emailVerified,
        createdAt: admin.createdAt
      });
    } else {
      console.log('❌ No admin found with email admin@example.com');
    }

    // Also check all users with admin role
    const allAdmins = await User.find({ role: 'admin' });
    console.log(`📊 Total admin users: ${allAdmins.length}`);
    allAdmins.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.status}) - ${user.fullName}`);
    });

    // Check total users
    const totalUsers = await User.countDocuments();
    console.log(`👥 Total users in database: ${totalUsers}`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkAdmin();
