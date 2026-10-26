import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITestParameterDoc {
  name: string;
  unit: string;
  normalRange: string;
  low?: number;
  high?: number;
  genderSpecific?: boolean;
  maleNormalRange?: string;
  femaleNormalRange?: string;
}

export interface ITestDoc extends Document {
  code: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  tatHours?: number;
  parameters: ITestParameterDoc[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestParameterSchema = new Schema<ITestParameterDoc>(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, default: '', trim: true },
    normalRange: { type: String, default: '', trim: true },
    low: { type: Number },
    high: { type: Number },
    genderSpecific: { type: Boolean, default: false },
    maleNormalRange: { type: String, default: '' },
    femaleNormalRange: { type: String, default: '' },
  },
  { _id: false }
);

const TestSchema = new Schema<ITestDoc>(
  {
    code: {
      type: String,
      required: [true, 'Test code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    sampleType: {
      type: String,
      required: [true, 'Sample type is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive'],
    },
    tatHours: {
      type: Number,
      default: 4,
    },
    parameters: [TestParameterSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Test: Model<ITestDoc> =
  mongoose.models.Test || mongoose.model<ITestDoc>('Test', TestSchema);
