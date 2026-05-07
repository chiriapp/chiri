import Loader2 from 'lucide-react/icons/loader-2';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { getIconByName } from '$constants/icons';
import { useAccounts, useAddCalendar, useUpdateAccount } from '$hooks/queries/useAccounts';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import { CalDAVClient } from '$lib/caldav';
import type { Calendar } from '$types';

interface CalendarModalProps {
  calendar?: Calendar;
  accountId: string;
  onClose: () => void;
}

export const CalendarModal = ({ calendar, accountId, onClose }: CalendarModalProps) => {
  const { data: accounts = [] } = useAccounts();
  const addCalendarMutation = useAddCalendar();
  const updateAccountMutation = useUpdateAccount();
  const { defaultCalendarColor, accentColor } = useSettingsStore();
  const colorPresets = useColorPresets();
  const fallbackColor = colorPresets[0] ?? accentColor;

  const resolvedDefaultCalendarColor =
    defaultCalendarColor === 'accent' ? accentColor : defaultCalendarColor;

  const [displayName, setDisplayName] = useState(calendar?.displayName ?? '');
  const [color, setColor] = useState(calendar?.color ?? resolvedDefaultCalendarColor);
  const [icon, setIcon] = useState(calendar?.icon || 'calendar');
  const [emoji, setEmoji] = useState(calendar?.emoji || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const focusTrapRef = useFocusTrap();

  const IconComponent = getIconByName(icon);

  const account = accounts.find((a) => a.id === accountId);
  const isVikunja =
    account?.serverType === 'vikunja' ||
    account?.calendars.some((c) => c.url.includes('/dav/projects'));
  const serverBaseUrl = account?.serverUrl.replace(/\/$/, '');
  const createProjectUrl = serverBaseUrl ? `${serverBaseUrl}/projects/new` : null;
  const editProjectUrl = (() => {
    if (!serverBaseUrl || !calendar) return null;
    const match = calendar.url.match(/\/dav\/projects\/(\d+)/);
    return match
      ? `${serverBaseUrl}/projects/${match[1]}/settings/edit`
      : `${serverBaseUrl}/projects`;
  })();

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (calendar) {
        // edit mode — only send properties that have actually changed (to server)
        const serverUpdates: { displayName?: string; color?: string } = {};

        if (displayName !== calendar.displayName) {
          serverUpdates.displayName = displayName;
        }

        if (color !== calendar.color) {
          serverUpdates.color = color;
        }

        const iconChanged = icon !== calendar.icon;
        const emojiChanged = emoji !== calendar.emoji;

        if (Object.keys(serverUpdates).length === 0 && !iconChanged && !emojiChanged) {
          onClose();
          return;
        }

        let result = { failedProperties: [] as string[] };

        if (Object.keys(serverUpdates).length > 0) {
          result = await CalDAVClient.getForAccount(accountId).updateCalendar(
            calendar.url,
            serverUpdates,
          );
        }

        const account = accounts.find((a) => a.id === accountId);
        if (account) {
          const updatedCalendars = account.calendars.map((c) => {
            if (c.id === calendar.id) {
              const updates: Partial<Calendar> = {};
              if (!result.failedProperties.includes('displayname')) {
                updates.displayName = displayName;
              }
              if (!result.failedProperties.includes('calendar-color')) {
                updates.color = color;
              }
              updates.icon = icon;
              updates.emoji = emoji;
              return { ...c, ...updates };
            }
            return c;
          });
          updateAccountMutation.mutate({ id: accountId, updates: { calendars: updatedCalendars } });
        }

        if (result.failedProperties.length > 0) {
          const failedNames = result.failedProperties
            .map((p) => (p === 'displayname' ? 'calendar name' : 'color'))
            .join(' and ');
          setWarning(`Server doesn't support updating ${failedNames}. Other changes were saved.`);
          return;
        }
      } else {
        // create mode
        const newCalendar = await CalDAVClient.getForAccount(accountId).createCalendar(
          displayName,
          color,
        );
        addCalendarMutation.mutate({ accountId, calendarData: { ...newCalendar, icon, emoji } });
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${calendar ? 'update' : 'create'} calendar`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalBackdrop zIndex="z-[60]">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in relative"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            {calendar ? 'Edit Calendar' : 'New Calendar'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="calendar-name"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Calendar Name
            </label>
            <div className="flex items-center gap-2">
              <IconEmojiPicker
                iconValue={icon}
                emojiValue={emoji}
                onIconChange={setIcon}
                onEmojiChange={setEmoji}
                color={color}
              />
              <ComposedInput
                ref={(el) => {
                  if (el) setTimeout(() => el.focus(), 100);
                }}
                id="calendar-name"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                placeholder="My Calendar"
                required
                className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`
                    w-8 h-8 rounded-full transition-all
                    ${color === preset ? 'ring-2 ring-offset-2 dark:ring-offset-surface-800 ring-primary-500 scale-110' : 'hover:scale-110'}
                  `}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 flex items-center justify-center hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
              />
              <ComposedInput
                type="text"
                value={color}
                onChange={setColor}
                placeholder={fallbackColor}
                className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Preview
            </p>
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
              style={{
                borderColor: color,
                backgroundColor: `${color}15`,
                color: color,
              }}
            >
              {emoji ? (
                <span className="text-sm leading-none">{emoji}</span>
              ) : (
                <IconComponent className="w-3.5 h-3.5" />
              )}
              {displayName || 'My Calendar'}
            </span>
          </div>

          {warning && (
            <div className="p-3 text-sm text-semantic-warning bg-semantic-warning/10 border border-semantic-warning/30 rounded-lg">
              {warning}
            </div>
          )}

          {isVikunja && calendar && (
            <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-xs text-semantic-info">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                Vikunja doesn't support editing projects via CalDAV.{' '}
                {editProjectUrl && (
                  <a
                    href={editProjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    Edit it in Vikunja
                  </a>
                )}{' '}
                then sync.
              </span>
            </div>
          )}

          {isVikunja && !calendar && (
            <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-xs text-semantic-info">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                Vikunja doesn't support creating projects via CalDAV.{' '}
                {createProjectUrl && (
                  <a
                    href={createProjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    Create it in Vikunja
                  </a>
                )}
                , then sync.
              </span>
            </div>
          )}

          {error && !isVikunja && (
            <div className="p-3 text-sm text-semantic-error bg-semantic-error/10 border border-semantic-error/30 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !displayName.trim() || isVikunja}
              className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {calendar ? 'Save' : 'Create Calendar'}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
};
