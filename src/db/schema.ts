import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(), // Hashing should be handled application-side
  isConfirmed: boolean('is_confirmed').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }), // Optional
  zodiacSign: varchar('zodiac_sign', { length: 50 }), // Optional
  personalGoals: varchar('personal_goals', { length: 200 }), // Optional, 200 chars
  gender: varchar('gender', { length: 50 }), // Optional
  age: integer('age'), // Optional
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations for Users table
export const usersRelations = relations(users, ({ many }) => ({
  drawnCards: many(drawnCards),
  authEvents: many(authEvents),
}));

// Drawn Cards Table
export const drawnCards = pgTable('drawn_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Foreign key with cascade delete
  cardName: varchar('card_name', { length: 100 }).notNull(),
  cardUpright: boolean('card_upright').default(true).notNull(),
  readingContext: text('reading_context'), // Optional
  drawnAt: timestamp('drawn_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations for Drawn Cards table
export const drawnCardsRelations = relations(drawnCards, ({ one }) => ({
  user: one(users, {
    fields: [drawnCards.userId],
    references: [users.id],
  }),
}));

// Auth Events Table
export const authEvents = pgTable('auth_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // e.g., 'login', 'logout', 'failed_login'
  ipAddress: varchar('ip_address', { length: 45 }), // Optional, for IPv4 or IPv6
  userAgent: text('user_agent'), // Optional
  eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// Relations for Auth Events table
export const authEventsRelations = relations(authEvents, ({ one }) => ({
  user: one(users, {
    fields: [authEvents.userId],
    references: [users.id],
  }),
})); 