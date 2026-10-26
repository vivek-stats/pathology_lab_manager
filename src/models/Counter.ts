import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  id: string; // Identifier key, e.g. 'patient_id_202610' or 'daily_serial_2026-10-26'
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    id: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increments and returns the next sequence number for a given key.
 */
export async function getNextSequence(sequenceName: string): Promise<number> {
  const result = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}
