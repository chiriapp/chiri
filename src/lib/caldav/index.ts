import { refreshOAuthAccountToken } from '$lib/auth/refresh';
import * as calendarOps from '$lib/caldav/calendars';
import type { Connection } from '$lib/caldav/connection';
import * as connectionOps from '$lib/caldav/connection';
import * as taskOps from '$lib/caldav/tasks';
import { type HttpRequestContext, isUnauthorizedError } from '$lib/http';
import { getAccountById } from '$lib/store/accounts';
import type { Account, ServerType } from '$types/account';
import type { Calendar } from '$types/calendar';
import type { Task } from '$types/task/model';

export class CalDAVClient {
  readonly accountId: string;
  private conn: Connection;

  private constructor(accountId: string, conn: Connection) {
    this.accountId = accountId;
    this.conn = conn;
  }

  private async withOAuthRecovery<T>(operation: (conn: Connection) => Promise<T>): Promise<T> {
    try {
      return await operation(this.conn);
    } catch (error) {
      const failedBearerToken = this.conn.credentials.bearerToken;
      if (!failedBearerToken || !isUnauthorizedError(error)) throw error;

      const account = getAccountById(this.accountId);
      const config = account?.caldav;
      if (config?.authType !== 'oauth' || !config.refreshToken) throw error;

      // a different operation may already have refreshed this account while
      // this client still held the rejected access token
      const accessToken =
        config.password === failedBearerToken
          ? (await refreshOAuthAccountToken(this.accountId, config.refreshToken)).accessToken
          : config.password;

      this.conn = connectionOps.replaceBearerToken(this.accountId, accessToken);
      return operation(this.conn);
    }
  }

  // connection management
  static getForAccount(accountId: string): CalDAVClient {
    const conn = connectionOps.getConnection(accountId);
    return new CalDAVClient(accountId, conn);
  }

  static async connect(
    accountId: string,
    serverUrl: string,
    username: string,
    password: string,
    serverType: ServerType = 'generic',
    calendarHomeUrl?: string,
    principalUrl?: string,
    acceptInvalidCerts?: boolean,
    bearerToken?: string,
    context?: HttpRequestContext,
  ) {
    return connectionOps.connect(
      accountId,
      serverUrl,
      username,
      password,
      serverType,
      calendarHomeUrl,
      principalUrl,
      acceptInvalidCerts,
      bearerToken,
      context,
    );
  }

  static async connectWithBearer(
    accountId: string,
    serverUrl: string,
    username: string,
    accessToken: string,
    serverType: ServerType = 'generic',
    calendarHomeUrl?: string,
    principalUrl?: string,
    acceptInvalidCerts?: boolean,
    context?: HttpRequestContext,
  ) {
    return connectionOps.connectWithBearer(
      accountId,
      serverUrl,
      username,
      accessToken,
      serverType,
      calendarHomeUrl,
      principalUrl,
      acceptInvalidCerts,
      context,
    );
  }

  static disconnect(accountId: string) {
    connectionOps.disconnect(accountId);
  }

  static isConnected(accountId: string) {
    return connectionOps.isConnected(accountId);
  }

  static async reconnect(account: Account, context?: HttpRequestContext, connectionId?: string) {
    return connectionOps.reconnect(account, context, connectionId);
  }

  // calendars
  async fetchCalendars(enforceVapid: boolean, context?: HttpRequestContext) {
    return this.withOAuthRecovery((conn) =>
      calendarOps.fetchCalendars(conn, this.accountId, enforceVapid, context),
    );
  }

  async discoverCalendars(enforceVapid: boolean, context?: HttpRequestContext) {
    return this.withOAuthRecovery((conn) =>
      calendarOps.discoverCalendars(conn, this.accountId, enforceVapid, context),
    );
  }

  async calendarExists(calendarUrl: string, context?: HttpRequestContext) {
    return this.withOAuthRecovery((conn) => calendarOps.calendarExists(conn, calendarUrl, context));
  }

  async createCalendar(
    displayName: string,
    color?: string,
    enforceVapid = false,
    context?: HttpRequestContext,
  ) {
    return this.withOAuthRecovery((conn) =>
      calendarOps.createCalendar(conn, this.accountId, displayName, color, enforceVapid, context),
    );
  }

  async probeVtodoCalendarCreation(enforceVapid = false, context?: HttpRequestContext) {
    return this.withOAuthRecovery((conn) =>
      calendarOps.probeVtodoCalendarCreation(conn, this.accountId, enforceVapid, context),
    );
  }

  async updateCalendar(
    calendarUrl: string,
    updates: { displayName?: string; color?: string; order?: number },
  ) {
    return this.withOAuthRecovery((conn) => calendarOps.updateCalendar(conn, calendarUrl, updates));
  }

  async deleteCalendar(calendarUrl: string, context?: HttpRequestContext) {
    return this.withOAuthRecovery((conn) => calendarOps.deleteCalendar(conn, calendarUrl, context));
  }

  // tasks
  async fetchTasks(calendar: Calendar) {
    return this.withOAuthRecovery((conn) => taskOps.fetchTasks(conn, this.accountId, calendar));
  }

  async createTask(calendar: Calendar, task: Task) {
    return this.withOAuthRecovery((conn) => taskOps.createTask(conn, calendar, task));
  }

  async updateTask(task: Task) {
    return this.withOAuthRecovery((conn) => taskOps.updateTask(conn, task));
  }

  async deleteTask(task: Task) {
    return this.withOAuthRecovery((conn) => taskOps.deleteTask(conn, task));
  }

  async syncCalendar(calendar: Calendar, localTasks: Task[]) {
    return this.withOAuthRecovery((conn) =>
      taskOps.syncCalendar(conn, this.accountId, calendar, localTasks),
    );
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
