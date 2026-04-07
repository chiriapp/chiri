import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { PushSubscriptionRow } from '$types/database';
import type { PushSubscription } from '$types/push';

/**
 * Convert database row to PushSubscription
 */
const rowToSubscription = (row: PushSubscriptionRow): PushSubscription => ({
  id: row.id,
  calendarId: row.calendar_id,
  accountId: row.account_id,
  registrationUrl: row.registration_url,
  pushResource: row.push_resource,
  expiresAt: new Date(row.expires_at),
  createdAt: new Date(row.created_at),
});

/**
 * Get all push subscriptions
 */
export const getAllPushSubscriptions = async (
  conn: DatabasePlugin,
): Promise<PushSubscription[]> => {
  const rows = await conn.select<PushSubscriptionRow[]>('SELECT * FROM push_subscriptions');
  return rows.map(rowToSubscription);
};

/**
 * Get push subscriptions for a calendar
 */
export const getPushSubscriptionsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
): Promise<PushSubscription[]> => {
  const rows = await conn.select<PushSubscriptionRow[]>(
    'SELECT * FROM push_subscriptions WHERE calendar_id = $1',
    [calendarId],
  );
  return rows.map(rowToSubscription);
};

/**
 * Get push subscriptions that are expiring soon (within specified hours)
 */
export const getExpiringSubscriptions = async (
  conn: DatabasePlugin,
  withinHours: number = 48,
): Promise<PushSubscription[]> => {
  const expiryThreshold = new Date(Date.now() + withinHours * 60 * 60 * 1000);
  const rows = await conn.select<PushSubscriptionRow[]>(
    'SELECT * FROM push_subscriptions WHERE expires_at < $1',
    [expiryThreshold.toISOString()],
  );
  return rows.map(rowToSubscription);
};

/**
 * Add or update a push subscription
 */
export const upsertPushSubscription = async (
  conn: DatabasePlugin,
  subscription: PushSubscription,
): Promise<void> => {
  await conn.execute(
    `INSERT OR REPLACE INTO push_subscriptions (id, calendar_id, account_id, registration_url, push_resource, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      subscription.id,
      subscription.calendarId,
      subscription.accountId,
      subscription.registrationUrl,
      subscription.pushResource,
      subscription.expiresAt.toISOString(),
      subscription.createdAt.toISOString(),
    ],
  );
};

/**
 * Delete a push subscription by ID
 */
export const deletePushSubscription = async (
  conn: DatabasePlugin,
  subscriptionId: string,
): Promise<void> => {
  await conn.execute('DELETE FROM push_subscriptions WHERE id = $1', [subscriptionId]);
};

/**
 * Delete all push subscriptions for a calendar
 */
export const deletePushSubscriptionsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
): Promise<void> => {
  await conn.execute('DELETE FROM push_subscriptions WHERE calendar_id = $1', [calendarId]);
};

/**
 * Delete all expired push subscriptions
 */
export const deleteExpiredSubscriptions = async (conn: DatabasePlugin): Promise<number> => {
  const now = new Date().toISOString();
  const result = await conn.execute('DELETE FROM push_subscriptions WHERE expires_at < $1', [now]);
  return result.rowsAffected;
};
