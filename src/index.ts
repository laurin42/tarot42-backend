import * as dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import cors from 'cors';
import { db, connectDb, disconnectDb } from './db'; 
import { users } from './db/schema'; 

const app = express();
const port = process.env.PORT || 8000; 

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Test endpoint to fetch users
app.get('/api/test-users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      return res.json({ message: 'No users found in the database (table is empty or connection issue).', data: [] });
    }
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    // Check if the error is related to client not being connected
    if (error instanceof Error && error.message.includes('Client has not been connected')) {
        return res.status(500).json({ error: 'Database client not connected. Ensure connectDb() was called and awaited successfully at startup.' });
    }
    res.status(500).json({ error: 'Failed to fetch users', details: (error instanceof Error) ? error.message : 'Unknown error' });
  }
});

app.get('/', (req, res) => {
  res.send('Tarot42 Backend is running!');
});

const startServer = async () => {
  await connectDb(); // Connect to the database before starting the server
  app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDb();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectDb();
  process.exit(0);
}); 