import { z } from 'zod';

export const LabSettingsSchema = z.object({
  labName: z
    .string()
    .min(2, 'Laboratory name must be at least 2 characters')
    .max(200, 'Laboratory name cannot exceed 200 characters')
    .transform((val) => val.trim()),
  tagline: z.string().max(300, 'Tagline cannot exceed 300 characters').optional().default(''),
  logoUrl: z
    .string()
    .max(3000000, 'Logo data exceeds maximum allowed size (approx 2.5MB)')
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        // Accept data URLs for uploaded images or standard web URLs
        return (
          val.startsWith('data:image/') ||
          val.startsWith('http://') ||
          val.startsWith('https://') ||
          val.startsWith('/')
        );
      },
      { message: 'Logo must be a valid image data URL, http(s) URL, or internal path' }
    )
    .optional()
    .default(''),
  registrationNumber: z.string().max(100).optional().default(''),
  accreditation: z.string().max(200).optional().default(''),

  // Contact Information
  primaryPhone: z.string().max(30).optional().default(''),
  secondaryPhone: z.string().max(30).optional().default(''),
  email: z
    .string()
    .max(100)
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
      },
      { message: 'Please provide a valid email address or leave empty' }
    )
    .optional()
    .default(''),
  website: z
    .string()
    .max(200)
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^https?:\/\/.+/i.test(val.trim()) || val.startsWith('www.');
      },
      { message: 'Please provide a valid website URL or leave empty' }
    )
    .optional()
    .default(''),
  whatsapp: z.string().max(30).optional().default(''),

  // Address
  addressLine1: z.string().max(200).optional().default(''),
  addressLine2: z.string().max(200).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default(''),
  postalCode: z.string().max(20).optional().default(''),
  country: z.string().max(100).optional().default('India'),

  // Report & Receipt Preferences
  reportHeader: z.string().max(300).optional().default(''),
  reportFooter: z.string().max(1000).optional().default(''),
  receiptFooter: z.string().max(1000).optional().default(''),
  signatoryName: z.string().max(100).optional().default(''),
  signatoryDesignation: z.string().max(150).optional().default(''),
  currency: z.string().max(10).optional().default('INR'),
  timezone: z.string().max(50).optional().default('Asia/Kolkata'),
});

export const UpdateLabSettingsSchema = LabSettingsSchema.partial();

export type LabSettingsInput = z.infer<typeof LabSettingsSchema>;
export type UpdateLabSettingsInput = z.infer<typeof UpdateLabSettingsSchema>;
