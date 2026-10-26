import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

/**
 * Global is used here to maintain a cached connection across hot reloads in development.
 * This prevents connections from growing exponentially during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastFailureTime: number;
  lastError: string | null;
  lastUri: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  lastFailureTime: 0,
  lastError: null,
  lastUri: null,
};

if (!cached) {
  cached = global.mongooseCache = {
    conn: null,
    promise: null,
    lastFailureTime: 0,
    lastError: null,
    lastUri: null,
  };
}

// 10-second cool-off window so an offline DB doesn't freeze the app on every navigation
const FAILURE_COOLDOWN_MS = 10000;

/**
 * Masks credentials in MongoDB URIs for safe server-side logging.
 * Example: mongodb+srv://admin:secretPass@cluster.net/db -> mongodb+srv://admin:***@cluster.net/db
 */
export function maskMongoUri(uri: string): string {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Reads the latest MONGODB_URI directly from .env.local to allow live credential updates
 * without requiring a complete Next.js server restart.
 */
export function getLatestMongoUri(): string {
  let uri = process.env.MONGODB_URI;

  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('MONGODB_URI=')) {
          const raw = trimmed.substring('MONGODB_URI='.length).replace(/["']/g, '').trim();
          if (raw) {
            uri = raw;
            process.env.MONGODB_URI = raw; // Sync process.env
          }
          break;
        }
      }
    }
  } catch (err) {
    // Fall back to process.env.MONGODB_URI
  }

  return uri || '';
}

export async function connectToDatabase(forceRetry: boolean = false): Promise<typeof mongoose> {
  const uri = getLatestMongoUri();

  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. Please set MONGODB_URI in .env.local.'
    );
  }

  // If URI changed since last connection attempt, force reconnect
  if (cached.lastUri && cached.lastUri !== uri) {
    console.log(`[MongoDB] Detected updated MONGODB_URI. Reconnecting to ${maskMongoUri(uri)}...`);
    if (cached.conn) {
      await mongoose.disconnect();
    }
    cached.conn = null;
    cached.promise = null;
    cached.lastFailureTime = 0;
    cached.lastError = null;
  }
  cached.lastUri = uri;

  // If already connected, return immediately
  if (mongoose.connection.readyState === 1 && cached.conn) {
    return cached.conn;
  }

  // If a recent attempt failed within cooldown window and forceRetry is not set, fail fast
  const now = Date.now();
  if (!forceRetry && cached.lastFailureTime > 0 && now - cached.lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error(cached.lastError || 'MongoDB is currently unreachable (cached state)');
  }

  if (!cached.promise) {
    const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net');
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: isAtlas ? 8000 : 2000, // 8s for Atlas cloud DNS/TLS, 2s for local
      connectTimeoutMS: isAtlas ? 10000 : 2000,
      socketTimeoutMS: 45000,
    };

    console.log(`[MongoDB] Initiating connection to ${maskMongoUri(uri)}...`);

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        cached.lastFailureTime = 0;
        cached.lastError = null;
        console.log(`[MongoDB] Connected successfully to database: ${mongooseInstance.connection.name}`);
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
    cached.lastFailureTime = 0;
    cached.lastError = null;
  } catch (e: any) {
    cached.promise = null;
    cached.conn = null;
    cached.lastFailureTime = Date.now();

    const rawMessage = e?.message || 'Connection refused or timed out';
    let humanMessage = rawMessage;

    if (rawMessage.includes('bad auth') || rawMessage.includes('Authentication failed')) {
      humanMessage =
        'Authentication Failed: The database credentials in MONGODB_URI were rejected by MongoDB Atlas. Verify your Database User username and password in Atlas under Security > Database Access.';
    } else if (rawMessage.includes('whitelist') || rawMessage.includes('timed out') || rawMessage.includes('ETIMEDOUT')) {
      humanMessage =
        'Network Timeout: Unable to reach MongoDB cluster. In Atlas, verify Security > Network Access to ensure your current IP or 0.0.0.0/0 is allowed.';
    }

    cached.lastError = humanMessage;
    console.error(`[MongoDB] Connection failed for ${maskMongoUri(uri)}: ${humanMessage}`);
    throw new Error(humanMessage);
  }

  return cached.conn;
}

/**
 * Diagnostic check to verify MongoDB connectivity state without throwing uncaught exceptions.
 */
export async function getDatabaseStatus(forceRetry: boolean = false): Promise<{
  isConnected: boolean;
  uriConfigured: boolean;
  maskedUri: string;
  message: string;
  error?: string;
}> {
  const uri = getLatestMongoUri();
  const masked = maskMongoUri(uri);

  if (!uri) {
    return {
      isConnected: false,
      uriConfigured: false,
      maskedUri: '',
      message: 'MONGODB_URI is not configured in .env.local',
    };
  }

  if (mongoose.connection.readyState === 1) {
    return {
      isConnected: true,
      uriConfigured: true,
      maskedUri: masked,
      message: `Connected to MongoDB database (${mongoose.connection.name})`,
    };
  }

  try {
    await connectToDatabase(forceRetry);
    return {
      isConnected: true,
      uriConfigured: true,
      maskedUri: masked,
      message: `Connected to MongoDB database (${mongoose.connection.name})`,
    };
  } catch (error: any) {
    return {
      isConnected: false,
      uriConfigured: true,
      maskedUri: masked,
      message: 'Cannot connect to MongoDB server',
      error: error?.message || 'Connection failed or timed out',
    };
  }
}

export const connectDB = connectToDatabase;

