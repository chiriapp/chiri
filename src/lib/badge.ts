import { Image } from '@tauri-apps/api/image';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';

/**
 * updates the application icon badge count across platforms
 * @param count The number to display, or 0/undefined to clear the badge
 */
export const updateAppBadge = async (count: number) => {
  try {
    const win = getCurrentWindow();
    const os = platform();

    const normalizedCount = count !== undefined && count > 0 ? count : undefined;

    if (os === 'macos' || os === 'linux') {
      await win.setBadgeCount(normalizedCount);
    } else if (os === 'windows') {
      if (normalizedCount !== undefined) {
        const badgeImage = await renderBadgeIcon(normalizedCount);
        if (badgeImage) {
          await win.setOverlayIcon(badgeImage);
        }
      } else {
        await win.setOverlayIcon(undefined);
      }
    }
  } catch (error) {
    console.error('Failed to update app badge:', error);
  }
};

/**
 * renders a small badge image with the given count for Windows taskbar overlays
 * @param count The number to display
 * @returns A Tauri Image object or null if rendering fails
 */
const renderBadgeIcon = async (count: number) => {
  try {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // draw background circle
    ctx.fillStyle = '#ef4444'; // Red (Tailwind semantic-error)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // draw number
    ctx.fillStyle = '#ffffff'; // White text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // adjust font size based on number length
    const text = count > 99 ? '99+' : count.toString();
    const fontSize = text.length > 2 ? 14 : text.length > 1 ? 16 : 20;
    ctx.font = `bold ${fontSize}px sans-serif`;

    ctx.fillText(text, size / 2, size / 2 + 1); // +1 for visual vertical centering

    // export to Uint8Array
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    return Image.fromBytes(uint8Array);
  } catch (error) {
    console.error('Failed to render badge icon:', error);
    return null;
  }
};
