import { Express } from "express";
import fetch from 'node-fetch';
import { eq, desc, sql } from "drizzle-orm";
import rateLimit from 'express-rate-limit';
import { db } from "../db/db.js";
import { posts, users, comments, events, resources, businesses, carousel_items } from "../db/schema.js";
import { setupAuth } from "./auth.js";
import { logger, type LogData } from "./utils/logger.js";

/**
 * Fetches Bitcoin price in PEN from CoinGecko API with retry logic
 */
async function fetchBitcoinPrice() {
  const retries = 3;
  const delay = 2000; // 2 second delay between retries
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      logger('Attempting to fetch Bitcoin price', {
        attempt: i + 1,
        timestamp: new Date().toISOString()
      } as LogData);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pen', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bitcoin Community Platform'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Bitcoin price: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data?.bitcoin?.pen) {
        throw new Error('Invalid price data format');
      }

      logger('Successfully fetched Bitcoin price', {
        price: data.bitcoin.pen,
        timestamp: new Date().toISOString()
      } as LogData);

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      logger('Bitcoin price fetch attempt failed', {
        attempt: i + 1,
        error: lastError.message,
        retryDelay: delay * (i + 1)
      } as LogData);
      
      if (i === retries - 1) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
    }
  }
}

export function registerRoutes(app: Express): void {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Bitcoin price endpoint with rate limiting
  const bitcoinPriceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  });

  app.get("/api/bitcoin/price", bitcoinPriceLimiter, async (_req, res) => {
    try {
      const data = await fetchBitcoinPrice();
      res.json(data);
    } catch (error) {
      logger('Failed to fetch Bitcoin price', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogData);
      res.status(500).json({ error: "Failed to fetch Bitcoin price" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (_req, res): Promise<void> => {
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

      // Fetch comments for each post
      const postsWithComments = await Promise.all(
        allPosts.map(async (post) => {
          const postComments = await db
            .select()
            .from(comments)
            .where(eq(comments.postId, post.id))
            .orderBy(comments.createdAt);
          
          return {
            ...post,
            comments: postComments
          };
        })
      );

      allPosts = postsWithComments;

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

        // Fetch comments for each post
        const postsWithComments = await Promise.all(
          allPosts.map(async (post) => {
            const postComments = await db
              .select()
              .from(comments)
              .where(eq(comments.postId, post.id))
              .orderBy(comments.createdAt);
            
            return {
              ...post,
              comments: postComments
            };
          })
        );

        allPosts = postsWithComments;
      }
      
      res.json(allPosts);
    } catch (error) {
      logger('Failed to fetch posts', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
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
      return res.json(post);
    } catch (error) {
      logger('Failed to create post', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Events routes
  app.get("/api/events", async (_req, res) => {
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
      logger('Failed to fetch events', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).send("Only administrators can create events");
    }

    try {
      const [event] = await db
        .insert(events)
        .values({
          ...req.body,
          organizerId: req.user.id,
        })
        .returning();
      return res.json(event);
    } catch (error) {
      logger('Failed to create event', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Update event endpoint
  app.put("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const [event] = await db
        .update(events)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(events.id, parseInt(req.params.id)))
        .returning();
      return res.json(event);
    } catch (error) {
      logger('Failed to update event', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete event endpoint
  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      await db
        .delete(events)
        .where(eq(events.id, parseInt(req.params.id)));
      return res.json({ success: true });
    } catch (error) {
      logger('Failed to delete event', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to delete event" });
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
      logger('Failed to update likes', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      res.status(500).json({ error: "Failed to update likes" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (_req, res) => {
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
      logger('Failed to fetch resources', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    if (req.user.role !== 'admin') {
      return res.status(403).send("Only administrators can create resources");
    }

    try {
      const [resource] = await db
        .insert(resources)
        .values({
          ...req.body,
          authorId: req.user.id,
        })
        .returning();
      return res.json(resource);
    } catch (error) {
      logger('Failed to create resource', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to create resource" });
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
      logger('Failed to fetch comments', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
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
      logger('Failed to create comment', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const totalResources = await db.select({ count: sql<number>`count(*)::int` }).from(resources);
      const totalEvents = await db.select({ count: sql<number>`count(*)::int` }).from(events);
      const totalBusinesses = await db.select({ count: sql<number>`count(*)::int` }).from(businesses);
      const carouselItemsData = await db.select().from(carousel_items).orderBy(desc(carousel_items.createdAt));
      
      const postsData = await db.select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

      const usersData = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        language: users.language
      })
      .from(users)
      .orderBy(desc(users.createdAt));

      const resourcesData = await db.select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        url: resources.url,
        type: resources.type,
        approved: resources.approved,
        createdAt: resources.createdAt,
        author: {
          id: users.id,
          username: users.username,
        }
      })
      .from(resources)
      .leftJoin(users, eq(resources.authorId, users.id))
      .orderBy(desc(resources.createdAt));

      const businessesData = await db.select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        city: businesses.city,
        phone: businesses.phone,
        website: businesses.website,
        acceptsLightning: businesses.acceptsLightning,
        verified: businesses.verified,
        createdAt: businesses.createdAt,
        submitter: {
          id: users.id,
          username: users.username,
        }
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.submittedById, users.id))
      .orderBy(desc(businesses.createdAt));

      const eventsData = await db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        date: events.date,
        organizerId: events.organizerId,
        createdAt: events.createdAt,
        organizer: {
          id: users.id,
          username: users.username,
        }
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .orderBy(desc(events.date));

      const stats = {
        totalUsers: totalUsers[0].count,
        totalResources: totalResources[0].count,
        totalEvents: totalEvents[0].count,
        totalBusinesses: totalBusinesses[0].count,
        posts: postsData,
        users: usersData,
        resources: resourcesData,
        businesses: businessesData,
        carouselItems: carouselItemsData,
        events: eventsData
      };

      return res.json(stats);
    } catch (error) {
      logger('Failed to fetch admin stats', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });
  // Admin delete post endpoint
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      await db
        .delete(posts)
        .where(eq(posts.id, parseInt(req.params.id)));
      return res.json({ success: true });
    } catch (error) {
      logger('Failed to delete post', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Resource approval endpoint
  app.post("/api/resources/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const [resource] = await db
        .update(resources)
        .set({ approved: true })
        .where(eq(resources.id, parseInt(req.params.id)))
        .returning();
      return res.json(resource);
    } catch (error) {
      logger('Failed to approve resource', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to approve resource" });
    }
  });

  // Admin delete resource endpoint
  app.delete("/api/resources/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      await db
        .delete(resources)
        .where(eq(resources.id, parseInt(req.params.id)));
      return res.json({ success: true });
    } catch (error) {
      logger('Failed to delete resource', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to delete resource" });
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
      
      return res.json({ message: "Language updated successfully" });
    } catch (error) {
      logger('Failed to update language preference', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).send("Failed to update language preference");
    }
  });

  // Businesses routes
  app.get("/api/businesses", async (_req, res) => {
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
      logger('Failed to fetch businesses', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
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
      return res.json(business);
    } catch (error) {
      logger('Failed to create business', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to create business" });
    }
  });
  // Carousel routes
  app.get("/api/carousel", async (_req, res) => {
    try {
      const items = await db.query.carousel_items.findMany({
        where: eq(carousel_items.active, true),
        orderBy: [desc(carousel_items.createdAt)]
      });
      return res.json(items);
    } catch (error) {
      logger('Failed to fetch carousel items', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to fetch carousel items" });
    }
  });

  app.post("/api/carousel", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const [item] = await db
        .insert(carousel_items)
        .values({
          ...req.body,
          createdById: req.user.id,
        })
        .returning();
      return res.json(item);
    } catch (error) {
      logger('Failed to create carousel item', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to create carousel item" });
    }
  });

  app.patch("/api/carousel/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      const [item] = await db
        .update(carousel_items)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(carousel_items.id, parseInt(req.params.id)))
        .returning();
      return res.json(item);
    } catch (error) {
      logger('Failed to update carousel item', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to update carousel item" });
    }
  });

  app.delete("/api/carousel/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      await db
        .delete(carousel_items)
        .where(eq(carousel_items.id, parseInt(req.params.id)));
      return res.json({ success: true });
    } catch (error) {
      logger('Failed to delete carousel item', { error: error instanceof Error ? error.message : 'Unknown error' } as LogData);
      return res.status(500).json({ error: "Failed to delete carousel item" });
    }
  });
}