import { type Express } from "express";
import { db } from "../db";
import { posts, events, resources, users, comments, businesses } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express) {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      let allPosts = await db.select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        authorId: posts.authorId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatar: users.avatar
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

      // If no posts exist, insert some sample posts
      if (allPosts.length === 0) {
        const samplePosts = [
          {
            title: "¡Bienvenidos a Orange Pill Peru!",
            content: "Este es el espacio para discutir todo sobre Bitcoin en Perú. Comparte tus experiencias y aprende de la comunidad.",
            authorId: 1
          },
          {
            title: "Guía: Cómo empezar con Bitcoin en Perú",
            content: "Una guía paso a paso para comprar, almacenar y usar Bitcoin en Perú de manera segura.",
            authorId: 1
          },
          {
            title: "Lightning Network en Perú",
            content: "Descubre cómo usar la Lightning Network para pagos instantáneos y económicos con Bitcoin.",
            authorId: 1
          }
        ];

        await db.insert(posts).values(samplePosts).returning();
        allPosts = await db.select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          authorId: posts.authorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          author: {
            id: users.id,
            username: users.username,
            avatar: users.avatar
          }
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.createdAt));
      }
      
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
          }
        ];

        const insertedEvents = await db.insert(events).values(sampleEvents).returning();
        allEvents = insertedEvents;
      }

      res.json(allEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
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

  app.post("/api/events/:id/like", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const [event] = await db
        .update(events)
        .set({ likes: sql`${events.likes} + 1` })
        .where(eq(events.id, eventId))
        .returning();
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to update likes" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (req, res) => {
    try {
      let allResources = await db
        .select()
        .from(resources)
        .orderBy(resources.createdAt);
      
      // If no resources exist, insert some initial resources
      if (allResources.length === 0) {
        const sampleResources = [
          {
            title: "Satoshi Nakamoto's Bitcoin Whitepaper",
            description: "The original Bitcoin whitepaper that started it all. Essential reading for understanding Bitcoin's fundamental design.",
            url: "https://bitcoin.org/bitcoin.pdf",
            type: "article",
            authorId: 1,
            approved: true
          },
          {
            title: "Bitcoin Mining Basics",
            description: "A comprehensive guide to Bitcoin mining from Braiins, covering everything from basic concepts to advanced topics.",
            url: "https://braiins.com/blog/bitcoin-mining-guide",
            type: "article",
            authorId: 1,
            approved: true
          },
          {
            title: "The Bitcoin Standard",
            description: "Learn about the history of money and why Bitcoin is the best form of money ever created.",
            url: "https://saifedean.com/thebitcoinstandard/",
            type: "book",
            authorId: 1,
            approved: true
          }
        ];

        const insertedResources = await db.insert(resources).values(sampleResources).returning();
        allResources = insertedResources;
      }

      res.json(allResources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
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

  // Admin routes
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const [[{ totalUsers }]] = await db
        .select({ totalUsers: sql`count(*)` })
        .from(users);

      const [[{ totalResources }]] = await db
        .select({ totalResources: sql`count(*)` })
        .from(resources);

      const [[{ totalEvents }]] = await db
        .select({ totalEvents: sql`count(*)` })
        .from(events);

      const [[{ totalBusinesses }]] = await db
        .select({ totalBusinesses: sql`count(*)` })
        .from(businesses);

      res.json({
        totalUsers,
        totalResources,
        totalEvents,
        totalBusinesses
      });
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
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

  // Businesses routes
  app.get("/api/businesses", async (req, res) => {
    try {
      let allBusinesses = await db
        .select()
        .from(businesses)
        .orderBy(businesses.createdAt);
      
      // If no businesses exist, insert some sample businesses
      if (allBusinesses.length === 0) {
        const sampleBusinesses = [
          {
            name: "Café Bitcoin",
            description: "Cafetería artesanal que acepta pagos en Bitcoin y Lightning Network. Ven a disfrutar de un café mientras conversas sobre Bitcoin.",
            address: "Av. Larco 345",
            city: "Miraflores, Lima",
            phone: "+51 1 234 5678",
            website: "https://cafebitcoin.pe",
            acceptsLightning: true,
            verified: true,
            submittedById: 1
          },
          {
            name: "Tech Store Crypto",
            description: "Tienda de tecnología que acepta Bitcoin. Encuentra los últimos gadgets y hardware wallets.",
            address: "Jr. de la Unión 618",
            city: "Centro de Lima",
            phone: "+51 1 987 6543",
            acceptsLightning: false,
            verified: true,
            submittedById: 1
          }
        ];

        const insertedBusinesses = await db.insert(businesses).values(sampleBusinesses).returning();
        allBusinesses = insertedBusinesses;
      }

      res.json(allBusinesses);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [business] = await db
        .insert(businesses)
        .values({
          ...req.body,
          submittedById: req.user.id,
          verified: false // New submissions start as unverified
        })
        .returning();
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  });
}
