import mongoose, { Schema, Document, Model } from 'mongoose';
import { getTodayISTDateString } from '@/lib/timezone';

export interface IDoctorPaymentDoc extends Document {
  doctor: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  dateStringIST: string; // YYYY-MM-DD in Asia/Kolkata
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  referenceNumber?: string;
  notes?: string;
  isAdjustment: boolean;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorPaymentSchema = new Schema<IDoctorPaymentDoc>(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be greater than zero'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dateStringIST: {
      type: String,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'cheque'],
      default: 'bank_transfer',
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isAdjustment: {
      type: Boolean,
      default: false,
    },
    recordedBy: {
      type: String,
      default: 'Accounts Manager',
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-validate hook to populate dateStringIST in Asia/Kolkata
DoctorPaymentSchema.pre('validate', function (next) {
  if (!this.dateStringIST) {
    this.dateStringIST = getTodayISTDateString();
  }
  next();
});

export const DoctorPayment: Model<IDoctorPaymentDoc> =
  mongoose.models.DoctorPayment ||
  mongoose.model<IDoctorPaymentDoc>('DoctorPayment', DoctorPaymentSchema);
