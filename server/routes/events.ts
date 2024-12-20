import { Router } from 'express';
import { z } from 'zod';
import { events, users, type User } from '../../db/schema';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import type { Request, Response, RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// Base event schema without transformation
const baseEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "Invalid date format")
});

// Create schemas with transformation
const eventSchema = baseEventSchema.transform(data => ({
  ...data,
  title: data.title.trim(),
  description: data.description.trim(),
  location: data.location.trim(),
  date: new Date(data.date)
}));

// Create partial schema for updates
const eventUpdateSchema = baseEventSchema.partial().transform(data => {
  const transformedData: Partial<{
    title: string;
    description: string;
    location: string;
    date: Date;
  }> = {};

  if (data.title) transformedData.title = data.title.trim();
  if (data.description) transformedData.description = data.description.trim();
  if (data.location) transformedData.location = data.location.trim();
  if (data.date) transformedData.date = new Date(data.date);

  return transformedData;
});

type EventInput = z.infer<typeof eventSchema>;
type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

// Type guard for admin authentication
function isAdmin(req: Request): req is AuthenticatedRequest & { user: User & { role: 'admin' } } {
  return Boolean(
    req.isAuthenticated?.() &&
    req.user &&
    'role' in req.user &&
    req.user.role === 'admin'
  );
}

// Event handlers with proper typing
const createEvent: RequestHandler = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only administrators can create events" });
  }

  try {
    const validationResult = eventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.format()
      });
    }

    const [event] = await db
      .insert(events)
      .values({
        ...validationResult.data,
        organizerId: req.user.id,
      })
      .returning();

    return res.json(event);
  } catch (error) {
    console.error("Failed to create event:", error);
    return res.status(500).json({
      error: "Failed to create event",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

const updateEvent: RequestHandler = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only administrators can update events" });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const validationResult = eventUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.format()
      });
    }

    // Only update fields that were provided
    const updateData = validationResult.data;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    const [event] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json(event);
  } catch (error) {
    console.error("Failed to update event:", error);
    return res.status(500).json({
      error: "Failed to update event",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

const deleteEvent: RequestHandler = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only administrators can delete events" });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const [event] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return res.status(500).json({
      error: "Failed to delete event",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Configure routes
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Get all events
router.get('/', (async (_req, res) => {
  try {
    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        location: events.location,
        organizerId: events.organizerId,
        likes: events.likes,
        createdAt: events.createdAt,
        organizer: {
          id: users.id,
          username: users.username,
        }
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .orderBy(desc(events.date));

    return res.json(allEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}) as RequestHandler);

export default router;