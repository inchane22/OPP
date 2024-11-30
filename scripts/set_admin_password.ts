import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const hashedPassword = await hashPassword("OPPwebsite2025");
  
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.username, "admin"));
    
  console.log("Admin password updated successfully");
  process.exit(0);
}

main().catch(console.error);
