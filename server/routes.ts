import { type Express } from "express";
import { db } from "../db";
import { posts, events, resources, users, comments, businesses } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { carousel_items } from "@db/schema";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express) {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

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

      // If no posts exist, try to insert sample posts
      if (allPosts.length === 0) {
        // First find an admin user to be the author
        const adminUser = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        
        if (adminUser.length > 0) {
          const samplePosts = [
            {
              title: "¡Bienvenidos a Orange Pill Peru!",
              content: "Este es el espacio para discutir todo sobre Bitcoin en Perú. Comparte tus experiencias y aprende de la comunidad.",
              authorId: adminUser[0].id
            },
            {
              title: "Guía: Cómo empezar con Bitcoin en Perú",
              content: "Una guía paso a paso para comprar, almacenar y usar Bitcoin en Perú de manera segura.",
              authorId: adminUser[0].id
            },
            {
              title: "Lightning Network en Perú",
              content: "Descubre cómo usar la Lightning Network para pagos instantáneos y económicos con Bitcoin.",
              authorId: adminUser[0].id
            }
          ];

          await db.insert(posts).values(samplePosts).returning();
        }
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
      return res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
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
      console.error("Failed to fetch events:", error);
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
      console.error("Failed to update event:", error);
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
      console.error("Failed to delete event:", error);
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
      console.error("Failed to fetch resources:", error);
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
      console.error("Failed to fetch admin stats:", error);
      return res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });
  // Admin delete post endpoint
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    const postId = parseInt(req.params.id);
    
    try {
      // Delete the post - comments will be deleted automatically due to CASCADE
      const [deletedPost] = await db
        .delete(posts)
        .where(eq(posts.id, postId))
        .returning();

      if (!deletedPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete post:", error);
      if (error instanceof Error) {
        return res.status(500).json({ 
          error: "Failed to delete post", 
          details: error.message 
        });
      }
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
      console.error("Failed to approve resource:", error);
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
      console.error("Failed to delete resource:", error);
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
      return res.json(business);
    } catch (error) {
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
      console.error("Failed to fetch carousel items:", error);
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
      console.error("Failed to create carousel item:", error);
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
      console.error("Failed to update carousel item:", error);
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
      console.error("Failed to delete carousel item:", error);
      return res.status(500).json({ error: "Failed to delete carousel item" });
    }
  });
}
