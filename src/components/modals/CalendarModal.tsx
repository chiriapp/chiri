import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { ComposedInput } from '@/components/ComposedInput';
import { useAccounts, useUpdateAccount } from '@/hooks/queries';
import { useModalEscapeKey } from '@/hooks/useModalEscapeKey';
import { caldavService } from '@/lib/caldav';
import type { Calendar } from '@/types';
import { COLOR_PRESETS, FALLBACK_ITEM_COLOR } from '@/utils/constants';
import { getIconByName } from '../../data/icons';
import { IconEmojiPicker } from '../IconEmojiPicker';

interface CalendarModalProps {
  calendar: Calendar;
  accountId: string;
  onClose: () => void;
}

export function CalendarModal({ calendar, accountId, onClose }: CalendarModalProps) {
  const { data: accounts = [] } = useAccounts();
  const updateAccountMutation = useUpdateAccount();

  const [displayName, setDisplayName] = useState(calendar.displayName);
  const [color, setColor] = useState(calendar.color ?? FALLBACK_ITEM_COLOR);
  const [icon, setIcon] = useState(calendar.icon || 'calendar');
  const [emoji, setEmoji] = useState(calendar.emoji || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const IconComponent = getIconByName(icon);

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // only send properties that have actually changed (to server)
      const serverUpdates: { displayName?: string; color?: string } = {};

      if (displayName !== calendar.displayName) {
        serverUpdates.displayName = displayName;
      }

      if (color !== calendar.color) {
        serverUpdates.color = color;
      }

      // track local-only changes (icon and emoji are stored locally only)
      const iconChanged = icon !== calendar.icon;
      const emojiChanged = emoji !== calendar.emoji;

      // if nothing changed at all, just close the modal
      if (Object.keys(serverUpdates).length === 0 && !iconChanged && !emojiChanged) {
        onClose();
        return;
      }

      let result = { failedProperties: [] as string[] };

      // only call server if server properties changed
      if (Object.keys(serverUpdates).length > 0) {
        // update calendar on server via PROPPATCH
        result = await caldavService.updateCalendar(accountId, calendar.url, serverUpdates);
      }

      // update local state (only update what succeeded + local-only fields)
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        const updatedCalendars = account.calendars.map((c) => {
          if (c.id === calendar.id) {
            const updates: Partial<Calendar> = {};
            // only update displayName locally if server accepted it
            if (!result.failedProperties.includes('displayname')) {
              updates.displayName = displayName;
            }
            // only update color locally if server accepted it
            if (!result.failedProperties.includes('calendar-color')) {
              updates.color = color;
            }
            // icon and emoji are always updated locally (not stored on server)
            updates.icon = icon;
            updates.emoji = emoji;
            return { ...c, ...updates };
          }
          return c;
        });
        updateAccountMutation.mutate({ id: accountId, updates: { calendars: updatedCalendars } });
      }

      // show warning if some properties failed
      if (result.failedProperties.length > 0) {
        const failedNames = result.failedProperties
          .map((p) => (p === 'displayname' ? 'calendar name' : 'color'))
          .join(' and ');
        setWarning(`Server doesn't support updating ${failedNames}. Other changes were saved.`);
        return; // don't close modal so user can see the warning
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            Edit Calendar
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
                id="calendar-name"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                placeholder="My Calendar"
                required
                className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
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
                placeholder={FALLBACK_ITEM_COLOR}
                className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
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
                <span className="text-sm">{emoji}</span>
              ) : (
                <IconComponent className="w-3.5 h-3.5" />
              )}
              {displayName ?? 'My Calendar'}
            </span>
          </div>

          {warning && (
            <div className="p-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              {warning}
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
