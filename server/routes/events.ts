import { Router } from 'express';
import { z } from 'zod';
import { events, users, type User } from '../../db/schema';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import type { Request, Response, RequestHandler } from 'express';

const router = Router();

// Event schema with strict typing
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  date: z.string().refine((date) => {
    try {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    } catch {
      return false;
    }
  }, "Invalid date format. Please provide a valid date string"),
});

type EventInput = z.infer<typeof eventSchema>;

// Extend express Request type for authenticated routes
interface AuthenticatedRequest extends Request {
  isAuthenticated(): this is AuthenticatedRequest & { user: User };
  user?: User;
}

// Event handlers with proper Express types
const createEvent: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Only administrators can create events" });
  }

  try {
    const result = eventSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.issues 
      });
    }

    const { title, description, location, date } = result.data;
    const parsedDate = new Date(date);

    const [event] = await db
      .insert(events)
      .values({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: parsedDate,
        organizerId: req.user.id,
      })
      .returning();

    return res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Only administrators can update events" });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const result = eventSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.issues 
      });
    }

    const updateData: Partial<typeof events.$inferInsert> = {};
    const { title, description, location, date } = result.data;

    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (location) updateData.location = location.trim();
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      updateData.date = parsedDate;
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
    console.error('Error updating event:', error);
    return res.status(500).json({ error: 'Failed to update event' });
  }
};

// Configure routes with proper Express types
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.get('/', async (_req: Request, res: Response) => {
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
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only administrators can delete events" });
    }

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
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;