import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
// import { fromNodeHeaders } from "better-auth/node";
import cors from 'cors';
// import { db, connectDb, disconnectDb } from './db'; // db wird in auth.ts importiert, connect/disconnect hier verwendet
import { connectDb, disconnectDb, db } from './db'; // Nur connect/disconnect hier, db wird in auth.ts geholt
import { authNodeHandler, authenticationMiddleware, authBaseFunctions } from '../auth'; // Corrected imports from auth.ts
import listEndpoints from 'express-list-endpoints';
// APIError might not be needed here anymore if no custom endpoints throw it.
// import { APIError } from 'better-auth/api'; 
// No longer needed here: verification schema, eq, and.
// import { verification } from './db/schema'; 
// import { eq, and } from 'drizzle-orm';

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
  authNodeHandler(req, res).catch(next); // Fehler an error handler weiterleiten
});

// 3. express.json() für ANDERE Routen, die es benötigen.
// Wird NICHT für /api/auth/* ausgeführt, da diese schon oben behandelt wurden.
app.use(express.json());

// Removed custom endpoint /api/custom-verify-delete-token

// Globaler Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[API_ERROR] Path: ${req.path} | Status: ${err.status} | Code: ${err.code} | Message: ${err.message}`, err.stack);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' ? err.status : 500;
  // Access err.data.code and err.data.message if APIError from 'better-auth/api' is used
  // Otherwise, access err.code and err.message directly if it's a different error type
  const responseErrorCode = err.data?.code || err.code || 'INTERNAL_SERVER_ERROR';
  const responseErrorMessage = err.data?.message || err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: responseErrorMessage,
    code: responseErrorCode,
  });
});


const startServer = async () => {
  await connectDb();
  app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
    // console.log(listEndpoints(app)); 
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