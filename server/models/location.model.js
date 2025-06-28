import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  type: { 
    type: String, 
    enum: ['warehouse'], 
    default: 'warehouse' 
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'], 
    default: 'active' 
  }
}, { timestamps: true });

export const Location = mongoose.model("Location", locationSchema);