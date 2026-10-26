import mongoose, { Schema, Document, Model } from 'mongoose';
import { getNextSequence } from './Counter';
import { getTodayISTDateString } from '@/lib/timezone';

export interface IVisitDoc extends Document {
  visitId: string;
  dailySerial: number;
  dateStringIST: string;
  visitDate: Date;
  patient: mongoose.Types.ObjectId;
  patientSnapshot: {
    name: string;
    age: number;
    ageUnit: 'years' | 'months' | 'days';
    gender: 'male' | 'female' | 'other';
    mobile?: string;
    permanentId: string;
    address?: string;
  };
  doctor?: mongoose.Types.ObjectId;
  doctorSnapshot?: {
    doctorId?: mongoose.Types.ObjectId;
    name: string;
    commissionPercent: number;
    eligibleAmount?: number;
    commissionAmount?: number;
  };
  doctorAuditTrail?: {
    previousDoctorId?: mongoose.Types.ObjectId;
    previousDoctorName: string;
    previousCommissionRate: number;
    previousCommissionAmount: number;
    newDoctorId?: mongoose.Types.ObjectId;
    newDoctorName: string;
    newCommissionRate: number;
    newCommissionAmount: number;
    reason: string;
    changedBy: string;
    changedAt: Date;
  }[];
  tests: {
    testId: mongoose.Types.ObjectId;
    code: string;
    name: string;
    category: string;
    sampleType: string;
    price: number;
    parameters: {
      name: string;
      unit: string;
      normalRange: string;
      low?: number;
      high?: number;
    }[];
  }[];
  results: {
    testId: mongoose.Types.ObjectId;
    testName: string;
    parameterName: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'low' | 'high' | 'abnormal' | 'pending';
    enteredAt?: Date;
    enteredBy?: string;
  }[];
  resultRevisions: {
    revisionNumber: number;
    savedAt: Date;
    savedBy: string;
    reasonForChange: string;
    results: any[];
  }[];
  status: 'registered' | 'sample_collected' | 'processing' | 'partial_ready' | 'completed' | 'cancelled';
  billing: {
    totalAmount: number;
    discount: number;
    netAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    payments: {
      amount: number;
      method: 'cash' | 'card' | 'upi' | 'net_banking';
      date: Date;
      transactionRef?: string;
      receivedBy?: string;
    }[];
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitTestSnapshotSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    sampleType: { type: String, required: true },
    price: { type: Number, required: true },
    parameters: [
      {
        name: { type: String, required: true },
        unit: { type: String, default: '' },
        normalRange: { type: String, default: '' },
        low: { type: Number },
        high: { type: Number },
      },
    ],
  },
  { _id: false }
);

const ResultItemSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    testName: { type: String, required: true },
    parameterName: { type: String, required: true },
    value: { type: String, default: '' },
    unit: { type: String, default: '' },
    normalRange: { type: String, default: '' },
    status: {
      type: String,
      enum: ['normal', 'low', 'high', 'abnormal', 'pending'],
      default: 'pending',
    },
    enteredAt: { type: Date },
    enteredBy: { type: String, default: 'Lab Staff' },
  },
  { _id: false }
);

const ResultRevisionSchema = new Schema(
  {
    revisionNumber: { type: Number, required: true },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: String, required: true },
    reasonForChange: { type: String, default: 'Result update' },
    results: [Schema.Types.Mixed],
  },
  { _id: false }
);

const PaymentRecordSchema = new Schema(
  {
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'net_banking'],
      default: 'cash',
    },
    date: { type: Date, default: Date.now },
    transactionRef: { type: String, trim: true },
    receivedBy: { type: String, default: 'Reception' },
  },
  { _id: false }
);

const VisitBillingSchema = new Schema(
  {
    totalAmount: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
      index: true,
    },
    payments: [PaymentRecordSchema],
  },
  { _id: false }
);

const VisitSchema = new Schema<IVisitDoc>(
  {
    visitId: {
      type: String,
      unique: true,
      index: true,
    },
    dailySerial: {
      type: Number,
      required: true,
      index: true,
    },
    dateStringIST: {
      type: String,
      required: true,
      index: true,
    },
    visitDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    patientSnapshot: {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      ageUnit: { type: String, default: 'years' },
      gender: { type: String, required: true },
      mobile: { type: String, default: '' },
      permanentId: { type: String, required: true },
      address: { type: String },
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      index: true,
    },
    doctorSnapshot: {
      doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
      name: { type: String, default: 'Self / Direct' },
      commissionPercent: { type: Number, default: 0 },
      eligibleAmount: { type: Number, default: 0 },
      commissionAmount: { type: Number, default: 0 },
    },
    doctorAuditTrail: [
      {
        previousDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
        previousDoctorName: { type: String, default: 'Self / Direct' },
        previousCommissionRate: { type: Number, default: 0 },
        previousCommissionAmount: { type: Number, default: 0 },
        newDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
        newDoctorName: { type: String, default: 'Self / Direct' },
        newCommissionRate: { type: Number, default: 0 },
        newCommissionAmount: { type: Number, default: 0 },
        reason: { type: String, required: true },
        changedBy: { type: String, default: 'Authorized Staff' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    tests: [VisitTestSnapshotSchema],
    results: [ResultItemSchema],
    resultRevisions: [ResultRevisionSchema],
    status: {
      type: String,
      enum: ['registered', 'sample_collected', 'processing', 'partial_ready', 'completed', 'cancelled'],
      default: 'registered',
      index: true,
    },
    billing: {
      type: VisitBillingSchema,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-validate hook to generate visitId and daily serial number
VisitSchema.pre('validate', async function (next) {
  if (this.isNew) {
    const todayIST = this.dateStringIST || getTodayISTDateString();
    this.dateStringIST = todayIST;

    if (!this.dailySerial) {
      this.dailySerial = await getNextSequence(`daily_serial_${todayIST}`);
    }

    if (!this.visitId) {
      const cleanDate = todayIST.replace(/-/g, '');
      const paddedSerial = String(this.dailySerial).padStart(4, '0');
      this.visitId = `VIS-${cleanDate}-${paddedSerial}`;
    }
  }
  next();
});

export const Visit: Model<IVisitDoc> =
  mongoose.models.Visit || mongoose.model<IVisitDoc>('Visit', VisitSchema);
