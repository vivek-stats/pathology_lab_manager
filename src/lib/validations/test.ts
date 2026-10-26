import { z } from 'zod';

export const TestParameterSchema = z
  .object({
    name: z.string().min(1, 'Parameter name is required').max(100),
    unit: z.string().max(50).optional().default(''),
    normalRange: z.string().max(100).optional().default(''),
    low: z.coerce.number().optional().nullable(),
    high: z.coerce.number().optional().nullable(),
    genderSpecific: z.boolean().optional().default(false),
    maleNormalRange: z.string().max(100).optional().default(''),
    femaleNormalRange: z.string().max(100).optional().default(''),
  })
  .superRefine((param, ctx) => {
    // Validate contradictory numeric bounds if both low and high are provided
    if (
      param.low !== undefined &&
      param.low !== null &&
      param.high !== undefined &&
      param.high !== null &&
      !isNaN(param.low) &&
      !isNaN(param.high)
    ) {
      if (param.low > param.high) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Low bound (${param.low}) cannot be greater than high bound (${param.high})`,
          path: ['low'],
        });
      }
    }
  });

export const TestBaseSchema = z.object({
  code: z
    .string()
    .min(1, 'Test code is required')
    .max(20, 'Test code cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Test code can only contain alphanumeric characters, hyphens, and underscores')
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(2, 'Test name must be at least 2 characters').max(150),
  category: z.string().min(2, 'Category must be at least 2 characters').max(100),
  sampleType: z.string().min(1, 'Sample type is required').max(100),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  tatHours: z.coerce.number().min(1, 'Turnaround time must be at least 1 hour').default(4),
  parameters: z
    .array(TestParameterSchema)
    .min(1, 'Every test must have at least one investigation parameter'),
  isActive: z.boolean().default(true),
});

export const TestSchema = TestBaseSchema.superRefine((data, ctx) => {
  // Validate duplicate parameter names within a single test (case-insensitive)
  const seenParamNames = new Set<string>();
  for (let i = 0; i < data.parameters.length; i++) {
    const cleanName = data.parameters[i].name.trim().toLowerCase();
    if (seenParamNames.has(cleanName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate parameter name '${data.parameters[i].name}' found in test`,
        path: ['parameters', i, 'name'],
      });
    } else {
      seenParamNames.add(cleanName);
    }
  }
});

export const UpdateTestSchema = TestBaseSchema.partial();

export type TestInput = z.infer<typeof TestSchema>;
export type UpdateTestInput = z.infer<typeof UpdateTestSchema>;
