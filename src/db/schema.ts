import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const user = pgTable("user", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
  
  // Astrologische Daten
  zodiacSign: varchar('zodiac_sign', { length: 50 }),
  selectedElement: varchar('selected_element', { length: 50 }),
  
  // Persönliche Ziele & Details
  personalGoals: text('personal_goals'), // Changed to text for longer content
  additionalDetails: text('additional_details'), // New field
  focusArea: varchar('focus_area', { length: 50 }), // New field
  
  // Demografische Daten
  gender: varchar('gender', { length: 50 }),
  ageRange: varchar('age_range', { length: 20 }), // New field (replaces age integer)
  
  // Geburtstag & Zeit
  birthDateTime: varchar('birth_date_time', { length: 50 }), // New field (replaces birthday timestamp)
  includeTime: boolean('include_time').default(false), // New field
  
  // Legacy/Admin fields
  age: integer('age'), // Keep for backward compatibility
  birthday: timestamp('birthday'), // Keep for backward compatibility
  isBanned: boolean('is_banned').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const userGoal = pgTable("user_goal", {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  goalText: text('goal_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isAchieved: boolean('is_achieved').default(false).notNull(),
});

export const session = pgTable("session", {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
});

export const drawnCards = pgTable('drawn_cards', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  cardName: varchar('card_name', { length: 100 }).notNull(),
  cardUpright: boolean('card_upright').default(true).notNull(),
  readingContext: text('reading_context'),
  drawnAt: timestamp('drawn_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authEvents = pgTable('auth_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  drawnCards: many(drawnCards),
  authEvents: many(authEvents),
  userGoals: many(userGoal),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const userGoalRelations = relations(userGoal, ({ one }) => ({
  user: one(user, {
    fields: [userGoal.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const drawnCardsRelations = relations(drawnCards, ({ one }) => ({
  user: one(user, {
    fields: [drawnCards.userId],
    references: [user.id],
  }),
}));

export const authEventsRelations = relations(authEvents, ({ one }) => ({
  user: one(user, {
    fields: [authEvents.userId],
    references: [user.id],
  }),
}));