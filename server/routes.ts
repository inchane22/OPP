import type { Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { posts, events, resources, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const allPosts = await db.select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        authorId: posts.authorId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));
      
      res.json(allPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [post] = await db
        .insert(posts)
        .values({
          ...req.body,
          authorId: req.user.id,
        })
        .returning();
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Events routes
  app.get("/api/events", async (req, res) => {
    try {
      const allEvents = await db.select().from(events).orderBy(events.date);
      res.json(allEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [event] = await db
        .insert(events)
        .values({
          ...req.body,
          organizerId: req.user.id,
        })
        .returning();
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (req, res) => {
    try {
      const allResources = await db
        .select()
        .from(resources)
        .orderBy(resources.createdAt);
      res.json(allResources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [resource] = await db
        .insert(resources)
        .values({
          ...req.body,
          authorId: req.user.id,
        })
        .returning();
      res.json(resource);
    } catch (error) {
      res.status(500).json({ error: "Failed to create resource" });
    }
  });
}
