import * as calendarOps from '$lib/caldav/calendars';
import type { Connection } from '$lib/caldav/connection';
import * as connectionOps from '$lib/caldav/connection';
import * as taskOps from '$lib/caldav/tasks';
import type { Account, Calendar, ServerType, Task } from '$types';

export class CalDAVClient {
  readonly accountId: string;
  private conn: Connection;

  private constructor(accountId: string, conn: Connection) {
    this.accountId = accountId;
    this.conn = conn;
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
    );
  }

  static disconnect(accountId: string) {
    connectionOps.disconnect(accountId);
  }

  static isConnected(accountId: string) {
    return connectionOps.isConnected(accountId);
  }

  static async reconnect(account: Account) {
    return connectionOps.reconnect(account);
  }

  // calendars
  async fetchCalendars(enforceVapid: boolean) {
    return calendarOps.fetchCalendars(this.conn, this.accountId, enforceVapid);
  }

  async discoverCalendars(enforceVapid: boolean) {
    return calendarOps.discoverCalendars(this.conn, this.accountId, enforceVapid);
  }

  async calendarExists(calendarUrl: string) {
    return calendarOps.calendarExists(this.conn, calendarUrl);
  }

  async createCalendar(displayName: string, color?: string, enforceVapid = false) {
    return calendarOps.createCalendar(this.conn, this.accountId, displayName, color, enforceVapid);
  }

  async probeVtodoCalendarCreation(enforceVapid = false) {
    return calendarOps.probeVtodoCalendarCreation(this.conn, this.accountId, enforceVapid);
  }

  async updateCalendar(
    calendarUrl: string,
    updates: { displayName?: string; color?: string; order?: number },
  ) {
    return calendarOps.updateCalendar(this.conn, calendarUrl, updates);
  }

  async deleteCalendar(calendarUrl: string) {
    return calendarOps.deleteCalendar(this.conn, calendarUrl);
  }

  // tasks
  async fetchTasks(calendar: Calendar) {
    return taskOps.fetchTasks(this.conn, this.accountId, calendar);
  }

  async createTask(calendar: Calendar, task: Task) {
    return taskOps.createTask(this.conn, calendar, task);
  }

  async updateTask(task: Task) {
    return taskOps.updateTask(this.conn, task);
  }

  async deleteTask(task: Task) {
    return taskOps.deleteTask(this.conn, task);
  }

  async syncCalendar(calendar: Calendar, localTasks: Task[]) {
    return taskOps.syncCalendar(this.conn, this.accountId, calendar, localTasks);
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
