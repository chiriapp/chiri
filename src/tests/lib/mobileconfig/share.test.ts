import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shareMobileConfig } from '$lib/mobileconfig/share';
import type { Account } from '$types';

const account = (): Account => ({
  id: 'account-1',
  name: 'Work',
  icon: 'user',
  emoji: '',
  calendars: [],
  isActive: true,
  sortOrder: 0,
  caldav: {
    serverUrl: 'https://caldav.example.test',
    username: 'alice',
    password: 'secret',
    serverType: 'generic',
    principalUrl: '/principals/alice/',
    authType: 'basic',
  },
});

describe('shareMobileConfig', () => {
  const share = vi.fn();
  const canShare = vi.fn();
  const clipboardWriteText = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      share,
      canShare,
      clipboard: { writeText: clipboardWriteText },
    });
    share.mockReset();
    canShare.mockReset();
    clipboardWriteText.mockReset();
  });

  it('shares the generated profile when the Web Share API is available', async () => {
    canShare.mockReturnValue(true);
    share.mockResolvedValue(undefined);

    const result = await shareMobileConfig(account(), { profileUuid: 'p', payloadUuid: 'u' });

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files).toHaveLength(1);
    expect(share.mock.calls[0][0].files[0].name).toMatch(/\.mobileconfig$/);
    expect(clipboardWriteText).not.toHaveBeenCalled();
  });

  it('copies the profile to the clipboard when sharing is not supported', async () => {
    canShare.mockReturnValue(false);

    const result = await shareMobileConfig(account(), { profileUuid: 'p', payloadUuid: 'u' });

    expect(result).toBe('copied');
    expect(share).not.toHaveBeenCalled();
    expect(clipboardWriteText).toHaveBeenCalledOnce();
    expect(clipboardWriteText.mock.calls[0][0]).toContain('CalDAVAccountDescription');
  });

  it('copies the profile to the clipboard when the share API throws', async () => {
    canShare.mockReturnValue(true);
    share.mockRejectedValue(new Error('share failed'));

    const result = await shareMobileConfig(account(), { profileUuid: 'p', payloadUuid: 'u' });

    expect(result).toBe('copied');
    expect(share).toHaveBeenCalledOnce();
    expect(clipboardWriteText).toHaveBeenCalledOnce();
  });

  it('rethrows AbortError when the user cancels the share sheet', async () => {
    canShare.mockReturnValue(true);
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    share.mockRejectedValue(abortError);

    await expect(
      shareMobileConfig(account(), { profileUuid: 'p', payloadUuid: 'u' }),
    ).rejects.toThrow('User cancelled');
    expect(clipboardWriteText).not.toHaveBeenCalled();
  });

  it('returns unsupported when neither sharing nor clipboard is available', async () => {
    vi.stubGlobal('navigator', { share: undefined, clipboard: undefined });

    const result = await shareMobileConfig(account(), { profileUuid: 'p', payloadUuid: 'u' });

    expect(result).toBe('unsupported');
  });
});
