import mongoose, { Schema, Document, Model } from 'mongoose';
import { getNextSequence } from './Counter';
import { getTodayISTDateString } from '@/lib/timezone';

export interface IPatientDoc extends Document {
  patientId: string;
  name: string;
  age: number;
  ageUnit: 'years' | 'months' | 'days';
  gender: 'male' | 'female' | 'other';
  mobile?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  referredByDoctor?: mongoose.Types.ObjectId;
  referredByDoctorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatientDoc>(
  {
    patientId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      index: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
    },
    ageUnit: {
      type: String,
      enum: ['years', 'months', 'days'],
      default: 'years',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''],
      default: 'Unknown',
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    referredByDoctor: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    referredByDoctorName: {
      type: String,
      trim: true,
      default: 'Self / Direct',
    },
  },
  { timestamps: true }
);

// Auto-generate permanent patient ID before save if not present: PAT-YYYYMM-XXXX
PatientSchema.pre('save', async function (next) {
  if (this.isNew && !this.patientId) {
    const today = getTodayISTDateString(); // "YYYY-MM-DD"
    const monthKey = today.substring(0, 7).replace('-', ''); // "YYYYMM"
    const seq = await getNextSequence(`patient_${monthKey}`);
    const padded = String(seq).padStart(4, '0');
    this.patientId = `PAT-${monthKey}-${padded}`;
  }
  next();
});

export const Patient: Model<IPatientDoc> =
  mongoose.models.Patient || mongoose.model<IPatientDoc>('Patient', PatientSchema);
