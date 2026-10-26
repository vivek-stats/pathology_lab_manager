import { z } from 'zod';

export const CreateVisitSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().optional().nullable(),
  testIds: z.array(z.string()).min(1, 'At least one test must be selected'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  paidAmount: z.coerce.number().min(0, 'Paid amount cannot be negative').default(0),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'net_banking']).default('cash'),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const UpdateResultsSchema = z.object({
  results: z.array(
    z.object({
      testId: z.string(),
      parameterName: z.string(),
      value: z.string(),
      unit: z.string().optional().default(''),
      normalRange: z.string().optional().default(''),
      status: z.enum(['normal', 'low', 'high', 'abnormal', 'pending']).default('normal'),
    })
  ),
  reasonForChange: z.string().optional(),
  enteredBy: z.string().optional(),
});

export const AddPaymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Payment amount must be greater than 0'),
  method: z.enum(['cash', 'card', 'upi', 'net_banking']).default('cash'),
  transactionRef: z.string().optional(),
  receivedBy: z.string().optional(),
});

export type CreateVisitInput = z.infer<typeof CreateVisitSchema>;
export type UpdateResultsInput = z.infer<typeof UpdateResultsSchema>;
export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;
