// src/index.ts - Füge diese Routen zu deinem Express Server hinzu

import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDb, disconnectDb } from './db';
import { verySpecificAuthHandlerForBetterAuth } from '../auth';
import listEndpoints from 'express-list-endpoints';

// Import your route handlers
import userProfileRoutes from './routes/userProfile';
import userGoalsRoutes from './routes/userGoals';

const app = express();
const port = process.env.PORT || 3000;

// 1. CORS Middleware
app.use(
  cors({
    origin: "http://localhost:8081",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 2. Better Auth Handler (BEFORE express.json())
app.all("/api/auth/*splat", (req: Request, res: Response, next: NextFunction) => {
  verySpecificAuthHandlerForBetterAuth(req, res).catch(next);
});

// 3. JSON Parser (for OTHER routes)
app.use(express.json());

// 4. API Routes
app.use('/api/profile', userProfileRoutes);
app.use('/api/goals', userGoalsRoutes);

// 5. Test route to verify server is running
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Tarot42 Backend is running' 
  });
});

// 6. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[API_ERROR] Path: ${req.path} | Status: ${err.status} | Code: ${err.code} | Message: ${err.message}`, err.stack);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' ? err.status : 500;
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
    console.log('Available API endpoints:');
    console.log('- POST /api/profile (update profile)');
    console.log('- GET /api/profile (get profile)');
    console.log('- GET /api/profile/completeness (get completeness)');
    console.log('- GET /api/goals (get user goals)');
    console.log('- POST /api/goals (create goal)');
    console.log('- PUT /api/goals/:goalId (update goal)');
    console.log('- DELETE /api/goals/:goalId (delete goal)');
    console.log('- GET /api/health (health check)');
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