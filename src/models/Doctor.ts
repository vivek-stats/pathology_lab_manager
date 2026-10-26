import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDoctorDoc extends Document {
  name: string;
  code: string;
  qualification?: string;
  specialization?: string;
  clinicAddress?: string;
  mobile?: string;
  email?: string;
  commissionPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctorDoc>(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
      default: 'General Physician',
    },
    clinicAddress: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Commission cannot be negative'],
      max: [100, 'Commission cannot exceed 100%'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Doctor: Model<IDoctorDoc> =
  mongoose.models.Doctor || mongoose.model<IDoctorDoc>('Doctor', DoctorSchema);
