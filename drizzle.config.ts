import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({
  path: ".env", // Ensure your .env file is in the root of the backend project
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts", // Path to your schema file(s)
  out: "./drizzle_migrations",    // Directory to output migration files
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true, // For more detailed output from Drizzle Kit
  strict: true,  // For stricter type checking
}); 