import { type Express, type Request, type Response } from "express";
import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@backup/db/schema";
import { db } from "@backup/db/index";
import { eq } from "drizzle-orm";
import { type AuthenticatedRequest } from "./types";

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

// Crypto utility functions
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Export auth setup function
export function setupAuth(app: Express): void {
  // ... rest of the auth setup implementation
}