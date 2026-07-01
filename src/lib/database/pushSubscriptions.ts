import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { PushSubscriptionRow } from '$types/database';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushSubscription,
} from '$types/push';

/**
 * convert database row to PushSubscription
 */
const rowToSubscription = (row: PushSubscriptionRow): PushSubscription => ({
  id: row.id,
  calendarId: row.calendar_id,
  accountId: row.account_id,
  registrationUrl: row.registration_url,
  pushResource: row.push_resource,
  providerId:
    row.provider_id === KUNIFIED_PUSH_PROVIDER_ID
      ? KUNIFIED_PUSH_PROVIDER_ID
      : NTFY_DIRECT_PROVIDER_ID,
  providerToken: row.provider_token || undefined,
  providerDistributor: row.provider_distributor || undefined,
  expiresAt: new Date(row.expires_at),
  createdAt: new Date(row.created_at),
});

/**
 * get all push subscriptions
 */
export const getAllPushSubscriptions = async (conn: DatabasePlugin) => {
  const rows = await conn.select<PushSubscriptionRow[]>('SELECT * FROM push_subscriptions');
  return rows.map(rowToSubscription);
};

/**
 * get push subscriptions for a calendar
 */
export const getPushSubscriptionsByCalendar = async (conn: DatabasePlugin, calendarId: string) => {
  const rows = await conn.select<PushSubscriptionRow[]>(
    'SELECT * FROM push_subscriptions WHERE calendar_id = $1',
    [calendarId],
  );
  return rows.map(rowToSubscription);
};

/**
 * add or update a push subscription
 */
export const upsertPushSubscription = async (
  conn: DatabasePlugin,
  subscription: PushSubscription,
) => {
  await conn.execute(
    `INSERT OR REPLACE INTO push_subscriptions (id, calendar_id, account_id, registration_url, push_resource, provider_id, provider_token, provider_distributor, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      subscription.id,
      subscription.calendarId,
      subscription.accountId,
      subscription.registrationUrl,
      subscription.pushResource,
      subscription.providerId,
      subscription.providerToken || null,
      subscription.providerDistributor || null,
      subscription.expiresAt.toISOString(),
      subscription.createdAt.toISOString(),
    ],
  );
};

/**
 * delete a push subscription by ID
 */
export const deletePushSubscription = async (conn: DatabasePlugin, subscriptionId: string) => {
  await conn.execute('DELETE FROM push_subscriptions WHERE id = $1', [subscriptionId]);
};

/**
 * delete all push subscriptions for a calendar
 */
export const deletePushSubscriptionsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
) => {
  await conn.execute('DELETE FROM push_subscriptions WHERE calendar_id = $1', [calendarId]);
};
