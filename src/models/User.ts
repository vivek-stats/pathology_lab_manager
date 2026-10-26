import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'technician' | 'receptionist' | 'pathologist';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'technician', 'receptionist', 'pathologist'],
      default: 'receptionist',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);
