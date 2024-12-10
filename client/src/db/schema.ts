import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.string(),
  createdAt: z.string(),
});

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const resourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  type: z.string(),
  authorId: z.string(),
  approved: z.boolean(),
  createdAt: z.string(),
});

export const businessSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  acceptsLightning: z.boolean(),
  verified: z.boolean(),
  createdAt: z.string(),
});

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  location: z.string(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
export type Post = z.infer<typeof postSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type Business = z.infer<typeof businessSchema>;
export type Event = z.infer<typeof eventSchema>;
