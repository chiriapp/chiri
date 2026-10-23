import { DEFAULT_SHORTCUTS, MAX_NOTIFICATION_ACTIONS } from '$constants';
import { clampSnoozeDurationValue } from '$lib/notifications/duration';
import {
  DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL,
  DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL,
} from '$lib/push/providers/mozillaAutopush';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/providers/ntfy';
import { getPercentCompleteForStatus } from '$lib/task/status';
import type { NotificationActionSettings } from '$types/notifications/settings';
import type { EditorFieldKey, EditorFieldVisibility } from '$types/settings/categories/editor';
import type { WorkingDay } from '$types/settings/categories/scheduling';
import { isProgressIncrement } from '$types/settings/categories/statusProgress';
import type { SettingsState } from '$types/settings/state';
import type { KeyboardShortcut } from '$types/shortcuts';
import { getShortcutSignature, isReservedShortcut } from '$utils/keyboard';
import { normalizeProxyPort } from '$utils/misc';

interface ShortcutMigration {
  originalLength: number;
  newLength: number;
  newIds: string[];
  removedIds: string[];
  changedIds: string[];
}

export interface NormalizedPreferences {
  state: SettingsState;
  migrated: boolean;
  shortcutMigration?: ShortcutMigration;
}

export const mergeShortcuts = (
  existingShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[],
) => {
  const existingMap = new Map(existingShortcuts.map((shortcut) => [shortcut.id, shortcut]));

  return defaultShortcuts.map((defaultShortcut) => {
    const existing = existingMap.get(defaultShortcut.id);
    if (existing && isReservedShortcut(existing)) return defaultShortcut;
    return existing || defaultShortcut;
  });
};

export const mergeOrder = <Value extends string>(storedOrder: unknown, defaultOrder: Value[]) => {
  if (!Array.isArray(storedOrder)) return defaultOrder;

  const validStoredOrder = storedOrder.filter((key): key is Value =>
    defaultOrder.includes(key as Value),
  );
  const missingKeys = defaultOrder.filter((key) => !validStoredOrder.includes(key));
  return [...validStoredOrder, ...missingKeys];
};

export const mergeEditorFieldVisibility = (
  storedVisibility: unknown,
  defaultVisibility: EditorFieldVisibility,
): EditorFieldVisibility => {
  if (!storedVisibility || typeof storedVisibility !== 'object') return defaultVisibility;

  const stored = storedVisibility as Partial<EditorFieldVisibility>;
  return {
    ...defaultVisibility,
    ...stored,
    // before progress became its own field, this preference controlled both
    // status and progress. preserve that behavior for existing settings
    progress: 'progress' in stored ? Boolean(stored.progress) : Boolean(stored.status),
  };
};

export const mergeEditorFieldOrder = (
  storedOrder: unknown,
  defaultOrder: EditorFieldKey[],
): EditorFieldKey[] => {
  const mergedOrder = mergeOrder(storedOrder, defaultOrder);
  if (!Array.isArray(storedOrder) || storedOrder.includes('progress')) return mergedOrder;

  const progressIndex = mergedOrder.indexOf('progress');
  const statusIndex = mergedOrder.indexOf('status');
  if (progressIndex === -1 || statusIndex === -1) return mergedOrder;

  const orderWithoutProgress: EditorFieldKey[] = mergedOrder.filter((key) => key !== 'progress');
  orderWithoutProgress.splice(statusIndex + 1, 0, 'progress');
  return orderWithoutProgress;
};

export const clampSnoozeDurations = (actions: NotificationActionSettings) => {
  const maxSnoozeDurations = actions.complete
    ? MAX_NOTIFICATION_ACTIONS - 1
    : MAX_NOTIFICATION_ACTIONS;
  return actions.snoozeDurations.slice(0, maxSnoozeDurations).map((duration) => ({
    ...duration,
    value: clampSnoozeDurationValue(duration.value, duration.unit),
  }));
};

const isWorkingDay = (value: unknown): value is WorkingDay =>
  typeof value === 'string' && ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export const normalizePreferences = (
  storedValue: unknown,
  defaultState: SettingsState,
): NormalizedPreferences => {
  const stored = isRecord(storedValue) ? storedValue : {};
  const deprecatedKeys = [
    'confirmBeforeDelete',
    'confirmBeforeDeletion',
    'confirmBeforePermanentDelete',
    'confirmBeforeDeleteCalendar',
    'confirmBeforeDeleteAccount',
    'confirmBeforeDeleteFilter',
    'confirmBeforeDeleteTag',
    'defaultAccountsExpanded',
  ];
  const storedState = Object.fromEntries(
    Object.entries(stored).filter(([key]) => !deprecatedKeys.includes(key)),
  ) as Partial<SettingsState>;
  const state = { ...defaultState, ...storedState };
  const storedKeys = new Set(Object.keys(stored));
  let migrated = deprecatedKeys.some((key) => storedKeys.has(key));

  const applyNormalized = <Key extends keyof SettingsState>(
    key: Key,
    value: SettingsState[Key],
  ) => {
    if (!valuesEqual(state[key], value)) migrated = true;
    state[key] = value;
  };

  applyNormalized('networkProxyPort', normalizeProxyPort(state.networkProxyPort));

  if (!isProgressIncrement(state.progressIncrement)) {
    applyNormalized('progressIncrement', defaultState.progressIncrement);
  }

  if (state.syncStatusProgress) {
    applyNormalized(
      'defaultPercentComplete',
      getPercentCompleteForStatus(state.defaultStatus, state.defaultPercentComplete) ?? 0,
    );
  }

  const legacyDefaultPushUrls = [
    ['ntfyServerUrl', DEFAULT_NTFY_SERVER_URL],
    ['mozillaAutopushWebsocketUrl', DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL],
    ['mozillaAutopushEndpointUrl', DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL],
  ] as const;
  for (const [key, defaultUrl] of legacyDefaultPushUrls) {
    if (state[key] === defaultUrl) applyNormalized(key, '');
  }

  if (Array.isArray(state.quickTimePresets)) {
    applyNormalized('quickTimePresets', defaultState.quickTimePresets);
  } else {
    applyNormalized('quickTimePresets', {
      ...defaultState.quickTimePresets,
      ...state.quickTimePresets,
    });
  }

  applyNormalized(
    'workingDays',
    Array.isArray(state.workingDays)
      ? state.workingDays.filter(isWorkingDay)
      : defaultState.workingDays,
  );

  applyNormalized(
    'editorFieldVisibility',
    mergeEditorFieldVisibility(state.editorFieldVisibility, defaultState.editorFieldVisibility),
  );

  const notificationActions = {
    ...defaultState.notificationActions,
    ...state.notificationActions,
  };
  notificationActions.order = mergeOrder(
    notificationActions.order,
    defaultState.notificationActions.order,
  );
  notificationActions.snoozeDurations = clampSnoozeDurations(notificationActions);
  applyNormalized('notificationActions', notificationActions);

  applyNormalized('taskBadgeVisibility', {
    ...defaultState.taskBadgeVisibility,
    ...state.taskBadgeVisibility,
  });
  applyNormalized(
    'editorFieldOrder',
    mergeEditorFieldOrder(state.editorFieldOrder, defaultState.editorFieldOrder),
  );
  applyNormalized('taskBadgeOrder', mergeOrder(state.taskBadgeOrder, defaultState.taskBadgeOrder));
  applyNormalized(
    'sidebarSectionOrder',
    mergeOrder(state.sidebarSectionOrder, defaultState.sidebarSectionOrder),
  );

  let shortcutMigration: ShortcutMigration | undefined;
  if (Array.isArray(stored.keyboardShortcuts)) {
    const originalShortcuts = stored.keyboardShortcuts as KeyboardShortcut[];
    const originalLength = originalShortcuts.length;
    const originalIds = originalShortcuts.map((shortcut) => shortcut.id);
    const originalShortcutsById = new Map(
      originalShortcuts.map((shortcut) => [shortcut.id, shortcut]),
    );
    const keyboardShortcuts = mergeShortcuts(originalShortcuts, DEFAULT_SHORTCUTS);
    const newIds = keyboardShortcuts
      .filter((shortcut) => !originalIds.includes(shortcut.id))
      .map((shortcut) => shortcut.id);
    const removedIds = originalIds.filter(
      (id) => !keyboardShortcuts.some((shortcut) => shortcut.id === id),
    );
    const changedIds = keyboardShortcuts
      .filter((shortcut) => {
        const original = originalShortcutsById.get(shortcut.id);
        return original && getShortcutSignature(original) !== getShortcutSignature(shortcut);
      })
      .map((shortcut) => shortcut.id);

    applyNormalized('keyboardShortcuts', keyboardShortcuts);

    if (keyboardShortcuts.length !== originalLength || changedIds.length > 0) {
      shortcutMigration = {
        originalLength,
        newLength: keyboardShortcuts.length,
        newIds,
        removedIds,
        changedIds,
      };
    }
  }

  if (!valuesEqual(storedState, state)) migrated = true;
  return { state, migrated, shortcutMigration };
};
