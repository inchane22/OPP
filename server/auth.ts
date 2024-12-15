import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, type Request, type Response } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

// Crypto utility functions for password hashing
const crypto = {
  // Hash password with salt
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  // Compare provided password with stored hash
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

export function setupAuth(app: Express) {
  // Enhanced session store with better security settings
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "orange-pill-peru-secret",
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
      ttl: 24 * 60 * 60, // Match cookie maxAge
      stale: false
    }),
  };

  // Set trust proxy for both environments
  app.set("trust proxy", 1);

  // Initialize Express session first
  app.use(session(sessionSettings));
  
  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // User data endpoint - returns authentication status without requiring auth
  app.get("/api/user", (req: Request, res: Response) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          language: req.user.language,
          role: req.user.role,
          avatar: req.user.avatar
        }
      });
    }
    return res.json({
      authenticated: false,
      user: null
    });
  });

  // Configure local strategy for username/password auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);
        
        // Find user by username
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        console.log('User found, verifying password');
        // Verify password
        const isMatch = await crypto.compare(password, user.password);
        console.log('Password match:', isMatch);
        
        if (!isMatch) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        return done(null, user);
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    })
  );

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: result.error.issues.map(i => i.message).join(", ") });
      }

      const { username, password, email } = result.data;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }

      // Create new user with hashed password
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          language: "es", // Default to Spanish
          role: "user",
        })
        .returning();

      // Log in after registration
      return new Promise<void>((resolve, reject) => {
        req.login(newUser, (err) => {
          if (err) {
            reject(err);
            return;
          }
          res.json({
            message: "Registro exitoso",
            user: { 
              id: newUser.id, 
              username: newUser.username,
              email: newUser.email,
              language: newUser.language,
              role: newUser.role
            },
          });
          resolve();
        });
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const authenticate = (req: Request, res: Response): Promise<Express.User> =>
        new Promise((resolve, reject) => {
          passport.authenticate("local", { session: true }, (err: any, user: Express.User, info: IVerifyOptions) => {
            if (err) return reject(err);
            if (!user) return reject(new Error(info?.message || "Authentication failed"));
            resolve(user);
          })(req, res, next);
        });

      const loginUser = (req: Request, user: Express.User): Promise<void> =>
        new Promise((resolve, reject) => {
          req.login(user, (err: Error | null) => {
            if (err) return reject(err);
            resolve();
          });
        });

      const user = await authenticate(req, res);
      await loginUser(req, user);

      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      return res.json({
        message: "Inicio de sesión exitoso",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          language: user.language,
          role: user.role
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(401).json({ 
        error: "Error al iniciar sesión",
        message: process.env.NODE_ENV === 'production' 
          ? "Credenciales inválidas" 
          : (error as Error).message
      });
    }
  });

  app.post("/api/logout", (req, res): Promise<void> => {
    return new Promise<void>((resolve) => {
      req.logout((err) => {
        if (err) {
          res.status(500).json({ error: "Error al cerrar sesión" });
        } else {
          res.json({ message: "Sesión cerrada exitosamente" });
        }
        resolve();
      });
    });
  });
}
