import { type Express } from "express";
import { db } from "@db/index";
import { posts, events, resources, users, comments, businesses, carousel_items } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { geocodeAddress } from "@server/utils/geocoding";

// Define strict types for database query results
interface PostAuthor {
  id: number;
  username: string;
  avatar: string | null;
}

interface PostComment {
  id: number;
  content: string;
  authorId: number | null;
  authorName: string | null;
  createdAt: Date;
  postId: number;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
  author: PostAuthor | null;
  comments?: PostComment[];
}

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (_req, res) => {
    try {
      const allPosts = await db.select({
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
      const postsWithComments: Post[] = await Promise.all(
        allPosts.map(async (post: Post) => {
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

      res.json(postsWithComments);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Rest of the routes implementation...
}