import mongoose from "mongoose";

/**
 * Reuse one connection in dev (Next.js hot reload) to avoid connection storms.
 * Connection string is read when connecting so `next build` can run without MongoDB.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== "production") {
  global.mongooseCache = cache;
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // A prior fulfilled promise is useless if the socket dropped (e.g. mongod stopped).
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cache.promise = null;
    cache.conn = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    await cache.promise;
    cache.conn = mongoose;
    return mongoose;
  } catch (err) {
    cache.promise = null;
    cache.conn = null;
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      /* ignore */
    }
    throw err;
  }
}
