import { z } from "zod";

export const businessSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  category: z.enum(['restaurant', 'retail', 'service', 'education', 'tourism', 'other']),
  acceptsLightning: z.boolean(),
  verified: z.boolean(),
  submittedById: z.number().nullable(),
  createdAt: z.date()
});

export const insertBusinessSchema = businessSchema.omit({ 
  id: true, 
  verified: true, 
  submittedById: true,
  createdAt: true 
});

export type Business = z.infer<typeof businessSchema>;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
