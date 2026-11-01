import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const sessions = sqliteTable('sessions', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), revision: integer('revision').notNull().default(0),
 state: text('state').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull()
});
export const inventory = sqliteTable('inventory', {
 id: text('id').primaryKey(), sessionId: text('session_id').notNull(), bookId: text('book_id').notNull(), quantity: integer('quantity').notNull()
});
export const resolutions = sqliteTable('resolutions', {
 id: text('id').primaryKey(), sessionId: text('session_id').notNull(), orderId: text('order_id').notNull(),
 token: text('token').notNull(), kind: text('kind').notNull(), bookId: text('book_id'), amount: integer('amount').notNull(),
 payload: text('payload').notNull(), createdAt: text('created_at').notNull()
}, t => [uniqueIndex('one_resolution_per_order').on(t.sessionId, t.orderId), uniqueIndex('resolution_token').on(t.token)]);
