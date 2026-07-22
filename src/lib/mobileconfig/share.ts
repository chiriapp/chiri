import type { Account } from '$types';
import type { MobileConfigGenerationOptions } from '$types/mobileconfig';
import { getMobileConfigFileName } from './export';
import { generateMobileConfig } from './generate';

const MOBILE_CONFIG_MIME_TYPE = 'application/x-apple-aspen-config';

export type ShareMobileConfigResult = 'shared' | 'copied' | 'unsupported';

/**
 * Share a generated .mobileconfig profile using the Web Share API.
 * Falls back to copying the profile XML to the clipboard if sharing is not available.
 */
export const shareMobileConfig = async (
  account: Account,
  options: MobileConfigGenerationOptions = {},
): Promise<ShareMobileConfigResult> => {
  const xml = generateMobileConfig(account, options);
  const fileName = getMobileConfigFileName(account);
  const file = new File([xml], fileName, { type: MOBILE_CONFIG_MIME_TYPE });
  const shareData = { files: [file] };

  const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;

  if (typeof navigator.share === 'function' && canShare) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      // User cancelled the share sheet — rethrow so the caller can ignore it.
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      // Otherwise fall back to the clipboard.
    }
  }

  if (typeof navigator.clipboard?.writeText === 'function') {
    await navigator.clipboard.writeText(xml);
    return 'copied';
  }

  return 'unsupported';
};
