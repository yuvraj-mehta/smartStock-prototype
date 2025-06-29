import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: 'https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=1024x1024&w=is&k=20&c=-mUWsTSENkugJ3qs5covpaj-bhYpxXY-v9RDpzsw504=',
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'viewer', 'supplier', 'transporter'],
    default: 'viewer',
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
  },
  wagePerHour: {
    type: Number,
    required: true,
    default: 0,
  },
  hoursThisMonth: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive',
  },
  assignedWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordTokenExpires: {
    type: Date,
    default: null,
  },
  lastLogin: {
    type: Date,
  },
}, { timestamps: true });  // automatically adds createdAt and updatedAt

export const User = mongoose.model('User', userSchema);