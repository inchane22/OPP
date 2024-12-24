import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
import { db } from "./db";
import { sql } from 'drizzle-orm';

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

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

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export async function setupAuth(app: Express): Promise<void> {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "orange-pill-peru-secret",
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
      ttl: 24 * 60 * 60,
      stale: false
    }),
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Case-insensitive username lookup
        const [user] = await db
          .select()
          .from(users)
          .where(sql`LOWER(username) = LOWER(${username.trim()})`)
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(sql`id = ${id}`)
        .limit(1);

      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration endpoint with improved error handling
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const { username, password, email } = result.data;

      // Case-insensitive username check
      const [existingUser] = await db
        .select()
        .from(users)
        .where(sql`LOWER(username) = LOWER(${username.trim()})`)
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username: username.trim(),
          password: hashedPassword,
          email: email?.toLowerCase().trim(),
          language: "es",
          role: "user",
        })
        .returning();

      // Login after registration
      await new Promise<void>((resolve, reject) => {
        req.login(newUser, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return res.json({
        message: "Registro exitoso",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          language: newUser.language,
          role: newUser.role
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('username_exists')) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }
      return res.status(500).json({ error: "Error en el registro" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info.message || "Error en el inicio de sesión" });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({
          message: "Inicio de sesión exitoso",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            language: user.language,
            role: user.role
          }
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      return res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        language: user.language,
        role: user.role,
        avatar: user.avatar
      });
    }
    return res.status(401).json({ error: "No has iniciado sesión" });
  });
}