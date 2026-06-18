import AlertTriangle from 'lucide-react/icons/triangle-alert';
import { type SubmitEvent, useState } from 'react';
import { ColorSwatchPicker } from '$components/ColorSwatchPicker';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderConfigState } from '$hooks/push/usePushProviderAvailability';
import { useAccounts, useAddCalendar, useUpdateAccount } from '$hooks/queries/useAccounts';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { enablePushForCalendar, isPushProviderAvailable } from '$lib/push';
import type { Calendar } from '$types';

const log = loggers.caldav;

interface CalendarModalProps {
  calendar?: Calendar;
  accountId: string;
  onClose: () => void;
}

export const CalendarModal = ({ calendar, accountId, onClose }: CalendarModalProps) => {
  const { data: accounts = [] } = useAccounts();
  const addCalendarMutation = useAddCalendar();
  const updateAccountMutation = useUpdateAccount();
  const { defaultCalendarColor, enablePush, pushProvider, ntfyServerUrl } = useSettingsStore();
  const { isResolvingKUnifiedPush, pushProviderConfig } = usePushProviderConfigState(
    pushProvider,
    ntfyServerUrl,
  );
  const colorPresets = useColorPresets();
  const resolveAccentColor = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();

  const resolvedDefaultCalendarColor =
    defaultCalendarColor === 'accent'
      ? resolvedAccentColor
      : resolveAccentColor(defaultCalendarColor);
  const initialColor = resolveAccentColor(calendar?.color ?? resolvedDefaultCalendarColor);

  const [displayName, setDisplayName] = useState(calendar?.displayName ?? '');
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(calendar?.icon || 'calendar');
  const [emoji, setEmoji] = useState(calendar?.emoji || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const displayNameInputRef = useInitialFocusRef<HTMLInputElement>();

  const account = accounts.find((a) => a.id === accountId);
  const isVikunja =
    account?.caldav?.serverType === 'vikunja' ||
    account?.calendars.some((c) => c.url.includes('/dav/projects'));
  const serverBaseUrl = account?.caldav?.serverUrl.replace(/\/$/, '');
  const createProjectUrl = serverBaseUrl ? `${serverBaseUrl}/projects/new` : null;
  const editProjectUrl = (() => {
    if (!serverBaseUrl || !calendar) return null;
    const match = calendar.url.match(/\/dav\/projects\/(\d+)/);
    return match
      ? `${serverBaseUrl}/projects/${match[1]}/settings/edit`
      : `${serverBaseUrl}/projects`;
  })();

  const updateExistingCalendar = async () => {
    if (!calendar) return true;

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
      return true;
    }

    let result = { failedProperties: [] as string[] };

    if (Object.keys(serverUpdates).length > 0 && account?.caldav) {
      result = await CalDAVClient.getForAccount(accountId).updateCalendar(
        calendar.url,
        serverUpdates,
      );
    }

    const currentAccount = accounts.find((a) => a.id === accountId);
    if (currentAccount) {
      const updatedCalendars = currentAccount.calendars.map((c) => {
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

    if (result.failedProperties.length === 0) return true;

    const failedNames = result.failedProperties
      .map((p) => (p === 'displayname' ? 'calendar name' : 'color'))
      .join(' and ');
    setWarning(`Server doesn't support updating ${failedNames}. Other changes were saved.`);
    return false;
  };

  const createNewCalendar = async () => {
    if (account?.caldav) {
      const newCalendar = await CalDAVClient.getForAccount(accountId).createCalendar(
        displayName,
        color,
      );
      const calendarData = { ...newCalendar, icon, emoji };
      await addCalendarMutation.mutateAsync({ accountId, calendarData });

      if (
        enablePush &&
        !isResolvingKUnifiedPush &&
        calendarData.pushSupported &&
        calendarData.pushTopic
      ) {
        try {
          const providerAvailable = await isPushProviderAvailable(pushProviderConfig);
          if (!providerAvailable) {
            log.warn(
              `Push provider unavailable; skipping push setup for ${calendarData.displayName}`,
            );
            return;
          }

          await enablePushForCalendar(accountId, calendarData, pushProviderConfig);
        } catch (error) {
          log.warn(
            `Failed to enable push for newly created calendar ${calendarData.displayName}:`,
            error,
          );
        }
      }
      return;
    }

    const id = crypto.randomUUID();
    await addCalendarMutation.mutateAsync({
      accountId,
      calendarData: { id, displayName, color, icon, emoji, url: `local://${id}` },
    });
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setIsLoading(true);

    try {
      let shouldClose = true;
      if (calendar) {
        shouldClose = await updateExistingCalendar();
      } else {
        await createNewCalendar();
      }
      if (shouldClose) onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${calendar ? 'update' : 'create'} calendar`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={calendar ? 'Edit Calendar' : 'New Calendar'}
      size="md"
      className="max-w-120"
      zIndex="z-60"
      contentPadding={false}
      contentOverflow="auto"
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton
            type="submit"
            form="calendar-form"
            disabled={isLoading || !displayName.trim() || isVikunja}
            loading={isLoading}
          >
            {calendar ? 'Save' : 'Create Calendar'}
          </ModalButton>
        </>
      }
    >
      <form id="calendar-form" onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label
            htmlFor="calendar-name"
            className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
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
              ref={displayNameInputRef}
              id="calendar-name"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="My Calendar"
              required
              className="flex-1 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 block font-medium text-sm text-surface-700 dark:text-surface-300">
            Color
          </p>
          <ColorSwatchPicker
            options={colorPresets.map((preset) => ({
              id: preset,
              value: preset,
              label: preset,
            }))}
            value={color}
            colorInputValue={color}
            onSelect={setColor}
            onCustomChange={setColor}
            selectedVariant="border"
          />
        </div>

        {warning && (
          <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 p-3 text-sm text-surface-700 dark:text-surface-300">
            {warning}
          </div>
        )}

        {isVikunja && calendar && (
          <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-semantic-info" />
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
          <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-semantic-info" />
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
          <div className="rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-semantic-error text-sm">
            {error}
          </div>
        )}
      </form>
    </ModalWrapper>
  );
};
