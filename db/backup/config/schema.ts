import { pgTable, text, integer, timestamp, boolean, serial, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique(),
  avatar: text("avatar"),
  bio: text("bio"),
  language: text("language").default("es").notNull(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  organizerId: integer("organizer_id").references(() => users.id).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id),
  authorName: text("author_name"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  phone: text("phone"),
  website: text("website"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  acceptsLightning: boolean("accepts_lightning").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(),
  submittedById: integer("submitted_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
export const carousel_items = pgTable("carousel_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  embed_url: text("embed_url").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by_id: integer("created_by_id").references(() => users.id)
});

export const carousel_items_backup_history = pgTable("carousel_items_backup_history", {
  id: serial("id").primaryKey(),
  carousel_item_id: integer("carousel_item_id").references(() => carousel_items.id),
  title: text("title").notNull(),
  embed_url: text("embed_url").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by_id: integer("created_by_id").references(() => users.id),
  backup_date: timestamp("backup_date").defaultNow().notNull(),
  item_id: integer("item_id")
});

// Add schema and type definitions for carousel_items_backup_history
export const insertCarouselItemBackupHistorySchema = createInsertSchema(carousel_items_backup_history);
export const selectCarouselItemBackupHistorySchema = createSelectSchema(carousel_items_backup_history);
export type InsertCarouselItemBackupHistory = z.infer<typeof insertCarouselItemBackupHistorySchema>;
export type CarouselItemBackupHistory = z.infer<typeof selectCarouselItemBackupHistorySchema>;

export const insertCarouselItemSchema = createInsertSchema(carousel_items);
export const selectCarouselItemSchema = createSelectSchema(carousel_items);
export type InsertCarouselItem = z.infer<typeof insertCarouselItemSchema>;
export type CarouselItem = z.infer<typeof selectCarouselItemSchema>;



export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = z.infer<typeof selectCommentSchema>;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertPostSchema = createInsertSchema(posts);
export const selectPostSchema = createSelectSchema(posts);
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = z.infer<typeof selectPostSchema>;

export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = z.infer<typeof selectEventSchema>;

export const insertResourceSchema = createInsertSchema(resources);
export const selectResourceSchema = createSelectSchema(resources);
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = z.infer<typeof selectResourceSchema>;

export const insertBusinessSchema = createInsertSchema(businesses);
export const selectBusinessSchema = createSelectSchema(businesses);
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = z.infer<typeof selectBusinessSchema>;