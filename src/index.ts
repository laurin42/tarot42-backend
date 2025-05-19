import * as dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
// import { fromNodeHeaders } from "better-auth/node"; // Nicht direkt hier verwendet
import cors from 'cors';
// import { db, connectDb, disconnectDb } from './db'; // db wird in auth.ts importiert, connect/disconnect hier verwendet
import { connectDb, disconnectDb } from './db'; // Nur connect/disconnect hier, db wird in auth.ts geholt
import authNodeHandler /*, { auth as authInstance } */ from '../auth'; // authInstance nicht direkt hier verwendet
import listEndpoints from 'express-list-endpoints';

const app = express();
const port = process.env.PORT || 3000;

// 1. CORS-Middleware früh anwenden
app.use(
  cors({
    origin: "http://localhost:8081",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 2. Better Auth Handler VOR express.json()
// Anfragen an /api/auth/* werden von authNodeHandler behandelt,
// der den Body selbst lesen muss (was er über toNodeHandler und den internen better-auth Handler tut).
app.all("/api/auth/*splat", (req: Request, res: Response, next: NextFunction) => {
  // console.log(`[INDEX_TS_AUTH_ROUTE] Request received for /api/auth/*splat: ${req.method} ${req.originalUrl}`);
  return authNodeHandler(req, res);
});

// 3. express.json() für ANDERE Routen, die es benötigen.
// Wird NICHT für /api/auth/* ausgeführt, da diese schon oben behandelt wurden.
app.use(express.json());

// Globaler Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[API_ERROR] Path: ${req.path} | Error: ${err.message}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal ServerError',
    // details: err.stack, // Stack trace can be removed for cleaner logs, or kept for dev
  });
});


const startServer = async () => {
  await connectDb();
  app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
    console.log(listEndpoints(app)); // listEndpoints nach allen Routendefinitionen
  });
};

startServer();

process.on('SIGINT', async () => {
  await disconnectDb();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectDb();
  process.exit(0);
});