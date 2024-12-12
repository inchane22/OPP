import { type Express } from "express";
import { db } from "../db";
import { posts, events, resources, users, comments, businesses } from "@db/schema";
// Types for Bitcoin price endpoint
interface BitcoinPrice {
  pen: number;
  provider: string;
  timestamp: number;
}

interface PriceData {
  bitcoin: BitcoinPrice;
  stale?: boolean;
}

interface PriceCache {
  data: PriceData | null;
  timestamp: number;
  ttl: number;
}

interface PriceProvider {
  name: string;
  fn: () => Promise<number>;
}

let priceCache: PriceCache = {
  data: null,
  timestamp: 0,
  ttl: 300000 // 5 minutes default TTL
};
import { eq, desc, sql } from "drizzle-orm";

import { carousel_items } from "@db/schema";
import { setupAuth } from "./auth";
import { geocodeAddress } from "./utils/geocoding";

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
      const { date, ...otherData } = req.body;
      
      // Validate and parse the date
      let parsedDate;
      if (date) {
        try {
          parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (dateError) {
          console.error("Date parsing error:", dateError);
          return res.status(400).json({ error: "Invalid date format provided" });
        }
      }

      const updatedData = {
        ...otherData,
        ...(parsedDate && { date: parsedDate }),
        updatedAt: new Date()
      };

      // Remove undefined fields to avoid overwriting with null
      Object.keys(updatedData).forEach(key => 
        updatedData[key] === undefined && delete updatedData[key]
      );

      const [event] = await db
        .update(events)
        .set(updatedData)
        .where(eq(events.id, parseInt(req.params.id)))
        .returning();

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.json(event);
    } catch (error) {
      console.error("Failed to update event:", error);
      if (error instanceof Error) {
        return res.status(500).json({ 
          error: "Failed to update event", 
          details: error.message 
        });
      }
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
      const carouselItemsData = await db.select({
        id: carousel_items.id,
        title: carousel_items.title,
        embed_url: carousel_items.embed_url,
        description: carousel_items.description,
        active: carousel_items.active,
        created_at: carousel_items.created_at,
        updated_at: carousel_items.updated_at,
        created_by_id: carousel_items.created_by_id
      })
      .from(carousel_items)
      .orderBy(desc(carousel_items.created_at));
      
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
        carousel: carouselItemsData,
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
  // Admin delete business endpoint
  app.delete("/api/businesses/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).send("Access denied");
    }

    try {
      await db
        .delete(businesses)
        .where(eq(businesses.id, parseInt(req.params.id)));
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete business:", error);
      return res.status(500).json({ error: "Failed to delete business" });
    }
  });

  // Update business endpoint
  app.patch("/api/businesses/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ error: "Invalid business ID" });
      }

      const updateData = {
        ...req.body,
        // Remove any fields that shouldn't be updated
        id: undefined,
        submittedById: undefined,
        createdAt: undefined
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      // Fetch current business data
      const currentBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (currentBusiness.length === 0) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Get address information for geocoding
      const address = updateData.address || currentBusiness[0].address;
      const city = updateData.city || currentBusiness[0].city;
      
      try {
        console.log('Attempting to geocode address:', address, city);
        const coordinates = await geocodeAddress(address, city);
        if (coordinates) {
          console.log('Successfully geocoded coordinates:', coordinates);
          updateData.latitude = coordinates.latitude;
          updateData.longitude = coordinates.longitude;
        } else {
          console.warn('Could not geocode address:', address, city);
        }
      } catch (geocodeError) {
        console.error('Error geocoding address:', geocodeError);
      }

      const [updatedBusiness] = await db
        .update(businesses)
        .set(updateData)
        .where(eq(businesses.id, businessId))
        .returning();

      if (!updatedBusiness) {
        return res.status(404).json({ error: "Business not found" });
      }

      return res.json(updatedBusiness);
    } catch (error) {
      console.error("Failed to update business:", error);
      return res.status(500).json({ 
        error: "Failed to update business",
        message: error instanceof Error ? error.message : "Unknown error"
      });
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
      // Get coordinates from address
      const coordinates = await geocodeAddress(req.body.address, req.body.city);
      
      const [business] = await db
        .insert(businesses)
        .values({
          ...req.body,
          submittedById: req.user.id,
          verified: false, // New submissions start as unverified
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null
        })
        .returning();
      return res.json(business);
    } catch (error) {
      console.error("Failed to create business:", error);
      return res.status(500).json({ error: "Failed to create business" });
    }
  });
  // Carousel routes
  // In-memory cache for Bitcoin price
  interface PriceData {
    bitcoin: {
      pen: number;
      provider: string;
      timestamp: number;
    }
  }

  interface PriceCache {
    data: PriceData | null;
    timestamp: number;
    ttl: number;
  }

  let priceCache: PriceCache = {
    data: null,
    timestamp: 0,
    ttl: 300000 // 5 minutes cache for better rate limit protection
  };

  async function fetchKrakenPrice() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [priceResponse, rateResponse] = await Promise.all([
        fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSDT', {
          headers: { 'User-Agent': 'BitcoinPENTracker/1.0' },
          signal: controller.signal
        }),
        fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          headers: { 'User-Agent': 'BitcoinPENTracker/1.0' },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      if (!priceResponse.ok) {
        throw new Error(`Kraken API error: ${priceResponse.status}`);
      }
      if (!rateResponse.ok) {
        throw new Error(`Exchange rate API error: ${rateResponse.status}`);
      }

      const [priceData, rateData] = await Promise.all([
        priceResponse.json(),
        rateResponse.json()
      ]);

      if (!priceData?.result?.XBTUSDT?.c?.[0] || isNaN(parseFloat(priceData.result.XBTUSDT.c[0]))) {
        throw new Error('Invalid price data from Kraken');
      }
      if (!rateData?.rates?.PEN || isNaN(rateData.rates.PEN)) {
        throw new Error('Invalid exchange rate data');
      }

      const btcUsdPrice = parseFloat(priceData.result.XBTUSDT.c[0]);
      const usdPenRate = rateData.rates.PEN;
      const finalPrice = btcUsdPrice * usdPenRate;

      if (finalPrice <= 0 || !isFinite(finalPrice)) {
        throw new Error('Invalid price calculation result');
      }

      return finalPrice;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(`Kraken price fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchBitsoPrice() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://api.bitso.com/v3/ticker/?book=btc_pen', {
        headers: { 'User-Agent': 'BitcoinPENTracker/1.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bitso API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.payload?.last || isNaN(parseFloat(data.payload.last))) {
        throw new Error('Invalid response structure from Bitso');
      }

      const price = parseFloat(data.payload.last);
      if (price <= 0 || !isFinite(price)) {
        throw new Error('Invalid price value from Bitso');
      }

      return price;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(`Bitso error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchBlockchainPrice() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [priceResponse, rateResponse] = await Promise.all([
        fetch('https://api.blockchain.com/v3/exchange/tickers/BTC-USD', {
          headers: { 'User-Agent': 'BitcoinPENTracker/1.0' },
          signal: controller.signal
        }),
        fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          headers: { 'User-Agent': 'BitcoinPENTracker/1.0' },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      if (!priceResponse.ok) {
        throw new Error(`Blockchain.com API error: ${priceResponse.status}`);
      }
      if (!rateResponse.ok) {
        throw new Error(`Exchange rate API error: ${rateResponse.status}`);
      }

      const [priceData, rateData] = await Promise.all([
        priceResponse.json(),
        rateResponse.json()
      ]);

      if (!priceData?.last_trade_price || isNaN(parseFloat(priceData.last_trade_price))) {
        throw new Error('Invalid price data from Blockchain.com');
      }
      if (!rateData?.rates?.PEN || isNaN(rateData.rates.PEN)) {
        throw new Error('Invalid exchange rate data');
      }

      const btcUsdPrice = parseFloat(priceData.last_trade_price);
      const usdPenRate = rateData.rates.PEN;
      const finalPrice = btcUsdPrice * usdPenRate;

      if (finalPrice <= 0 || !isFinite(finalPrice)) {
        throw new Error('Invalid price calculation result');
      }

      return finalPrice;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(`Blockchain.com price fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchCoingeckoPrice() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pen', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitcoinPENTracker/1.0',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit reached');
        }
        const errorBody = await response.text();
        throw new Error(`CoinGecko API error: ${response.status} - ${errorBody}`);
      }
      
      const data = await response.json();
      if (!data?.bitcoin?.pen || typeof data.bitcoin.pen !== 'number' || data.bitcoin.pen <= 0) {
        throw new Error('Invalid price data structure');
      }
      return data.bitcoin.pen;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(`CoinGecko error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Bitcoin price proxy endpoint with multiple providers and caching
  app.get("/api/bitcoin/price", async (_req, res): Promise<void> => {
    try {
      // Check cache first
      const now = Date.now();
      if (priceCache.data && (now - priceCache.timestamp) < priceCache.ttl) {
        console.log('Returning cached price data');
        res.json(priceCache.data);
        return;
      }

      console.log('Cache miss or expired, fetching fresh price data...');

      const providers = [
        { name: 'Kraken', fn: fetchKrakenPrice },
        { name: 'Bitso', fn: fetchBitsoPrice },
        { name: 'Blockchain.com', fn: fetchBlockchainPrice },
        { name: 'CoinGecko', fn: fetchCoingeckoPrice }
      ];

      // If cache exists but is stale, we'll use it as fallback
      const staleCacheTimeout = 1800000; // 30 minutes
      const hasStaleCache = priceCache.data && (now - priceCache.timestamp) < staleCacheTimeout;
      
      let lastError: Error | null = null;
      
      // Try each provider until we get a valid price
      for (const provider of providers) {
        try {
          console.log(`Attempting to fetch price from ${provider.name}...`);
          const price = await provider.fn();
          
          if (price && price > 0) {
            console.log(`Successfully fetched price from ${provider.name}`);
            const priceData = {
              bitcoin: {
                pen: price,
                provider: provider.name,
                timestamp: Date.now()
              }
            };
            
            // Update cache
            priceCache = {
              data: priceData,
              timestamp: Date.now(),
              ttl: 300000 // 5 minutes
            };
            
            res.json(priceData);
            return;
          }
          
          console.warn(`Invalid price (${price}) received from ${provider.name}`);
        } catch (error) {
          console.error(`Error fetching from ${provider.name}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          continue;
        }
      }

      // If we have stale cache, use it as fallback
      if (hasStaleCache) {
        console.log('All providers failed, using stale cache as fallback');
        res.json({
          ...priceCache.data,
          stale: true
        });
        return;
      }

      // If all providers failed and no cache available
      console.error('All providers failed and no cache available');
      res.status(503).json({
        error: 'Unable to fetch Bitcoin price',
        message: 'All providers are currently unavailable',
        details: lastError?.message || 'Unknown error'
      });
      return;
        // End of provider loop - if we get here, all providers failed
      return;
    } catch (error) {
      console.error('Bitcoin price fetch failed:', error instanceof Error ? error.message : 'Unknown error');
      res.status(503).json({
        error: "Failed to fetch Bitcoin price",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  });

  app.get("/api/carousel", async (_req, res) => {
    try {
      const items = await db
        .select({
          id: carousel_items.id,
          title: carousel_items.title,
          embed_url: carousel_items.embed_url,
          description: carousel_items.description,
          active: carousel_items.active,
          created_at: carousel_items.created_at,
          updated_at: carousel_items.updated_at,
          created_by_id: carousel_items.created_by_id
        })
        .from(carousel_items)
        .where(eq(carousel_items.active, true))
        .orderBy(desc(carousel_items.created_at));

      if (!items || items.length === 0) {
        console.log('No active carousel items found');
        return res.json([]);  // Return empty array instead of 404 for better client handling
      }

      console.log(`Successfully fetched ${items.length} carousel items`);
      return res.json(items);
    } catch (error) {
      console.error("Failed to fetch carousel items:", error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        error: "Failed to fetch carousel items",
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
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
