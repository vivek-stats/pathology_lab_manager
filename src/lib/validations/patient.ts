import { z } from 'zod';

export const PatientBaseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  age: z.coerce.number().min(0, 'Age must be 0 or greater'),
  ageUnit: z.enum(['years', 'months', 'days']).default('years'),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Please select a valid gender' }),
  }),
  mobile: z.string().max(20).optional().nullable().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().max(300).optional().nullable().or(z.literal('')),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''])
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContact: z.string().max(20).optional().nullable().or(z.literal('')),
  referredByDoctor: z.string().optional().nullable().or(z.literal('')),
});

export const PatientSchema = PatientBaseSchema.superRefine((data, ctx) => {
  // Sensible age validation according to selected age unit
  if (data.ageUnit === 'years' && data.age > 150) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Age in years cannot exceed 150',
      path: ['age'],
    });
  } else if (data.ageUnit === 'months' && data.age > 120) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Age in months cannot exceed 120',
      path: ['age'],
    });
  } else if (data.ageUnit === 'days' && data.age > 365) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Age in days cannot exceed 365',
      path: ['age'],
    });
  }

  // Optional mobile validation if provided
  if (data.mobile && data.mobile.trim()) {
    const cleanMobile = data.mobile.trim();
    if (!/^[0-9+ -]{7,15}$/.test(cleanMobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid mobile number format',
        path: ['mobile'],
      });
    }
  }
});

export const UpdatePatientSchema = PatientBaseSchema.partial();

export type PatientInput = z.infer<typeof PatientSchema>;
