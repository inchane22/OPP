import type { Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { posts, events, resources, users, comments } from "@db/schema";
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
      let allEvents = await db.select().from(events).orderBy(events.date);
      
      // If no events exist, insert some sample events
      if (allEvents.length === 0) {
        const sampleEvents = [
          {
            title: "Bitcoin Meetup Lima",
            description: "Monthly Bitcoin meetup in Lima. Topics: Lightning Network and Mining",
            date: new Date("2024-12-15T18:00:00"),
            location: "Miraflores, Lima",
            organizerId: 1
          },
          {
            title: "Orange Pill Workshop",
            description: "Introduction to Bitcoin basics and why it matters",
            date: new Date("2024-12-05T15:00:00"),
            location: "Barranco, Lima",
            organizerId: 1
          },
          {
            title: "Mining in Peru Conference",
            description: "Exploring opportunities for Bitcoin mining in Peru",
            date: new Date("2025-01-20T09:00:00"),
            location: "San Isidro, Lima",
            organizerId: 1
          },
          {
            title: "Bitcoin Beach Peru Launch",
            description: "Launching the first Bitcoin Beach community in Peru",
            date: new Date("2024-12-30T11:00:00"),
            location: "Máncora, Piura",
            organizerId: 1
          }
        ];

        const insertedEvents = await db.insert(events).values(sampleEvents).returning();
        allEvents = insertedEvents;
      }

      res.json(allEvents);
    } catch (error) {
      console.error("Failed to fetch or create events:", error);
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
  // Comments routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const allComments = await db
        .select()
        .from(comments)
        .where(eq(comments.postId, postId))
        .orderBy(comments.createdAt);
      res.json(allComments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/posts/:postId/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const { content, authorName } = req.body;
      
      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          content,
          authorId: req.isAuthenticated() ? req.user.id : null,
          authorName: req.isAuthenticated() ? req.user.username : authorName || "Anonymous"
        })
        .returning();
        
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Language preference update endpoint
  app.post("/api/user/language", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    const { language } = req.body;
    if (language !== "en" && language !== "es") {
      return res.status(400).send("Invalid language");
    }

    try {
      await db
        .update(users)
        .set({ language })
        .where(eq(users.id, req.user.id));
      
      res.json({ message: "Language updated successfully" });
    } catch (error) {
      res.status(500).send("Failed to update language preference");
    }
  });
}
