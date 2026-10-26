import { z } from 'zod';

export const DoctorSchema = z.object({
  name: z.string().min(2, 'Doctor name must be at least 2 characters').max(100),
  code: z.string().max(20).optional().or(z.literal('')),
  qualification: z.string().max(100).optional().or(z.literal('')),
  specialization: z.string().max(100).default('General Physician'),
  clinicAddress: z.string().max(300).optional().or(z.literal('')),
  mobile: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits')
    .max(15, 'Mobile number too long')
    .regex(/^[0-9+ -]+$/, 'Invalid mobile number format')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  commissionPercent: z.coerce
    .number()
    .min(0, 'Commission cannot be negative')
    .max(100, 'Commission cannot exceed 100%')
    .default(0),
  isActive: z.boolean().default(true),
});

export const DoctorPaymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Payment amount must be greater than 0'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque']).default('bank_transfer'),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  isAdjustment: z.boolean().default(false),
  recordedBy: z.string().max(100).optional(),
});

export type DoctorInput = z.infer<typeof DoctorSchema>;
export type DoctorPaymentInput = z.infer<typeof DoctorPaymentSchema>;
