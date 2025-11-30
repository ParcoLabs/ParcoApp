import { pgTable, text, timestamp, varchar, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const kycStatusEnum = pgEnum('kyc_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  kycStatus: kycStatusEnum('kyc_status').default('PENDING').notNull(),
  usdcBalance: decimal('usdc_balance', { precision: 18, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  totalValue: decimal('total_value', { precision: 18, scale: 2 }).notNull(),
  tokenPrice: decimal('token_price', { precision: 18, scale: 2 }).notNull(),
  tokensAvailable: decimal('tokens_available', { precision: 18, scale: 0 }).notNull(),
  tokensTotal: decimal('tokens_total', { precision: 18, scale: 0 }).notNull(),
  rentalYield: decimal('rental_yield', { precision: 5, scale: 2 }).notNull(),
  image: text('image'),
  propertyType: varchar('property_type', { length: 50 }).notNull(),
  contractAddress: varchar('contract_address', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const holdings = pgTable('holdings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  propertyId: text('property_id').notNull().references(() => properties.id),
  tokenCount: decimal('token_count', { precision: 18, scale: 0 }).notNull(),
  avgCostBasis: decimal('avg_cost_basis', { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
