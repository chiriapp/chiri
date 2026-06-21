import { invoke } from '@tauri-apps/api/core';
import type { MobileConfigDecodeResult } from '$types/mobileconfig';

/** decode a configuration profile into typed CalDAV payload candidates */
export const decodeMobileConfig = async (bytes: Uint8Array) =>
  await invoke<MobileConfigDecodeResult>('decode_mobile_config', { data: Array.from(bytes) });

/** legacy XML bridge retained until the frontend import mapper migrates */
export const decodeMobileConfigXml = async (bytes: Uint8Array) => {
  const textDecoder = new TextDecoder('utf-8');
  const preview = textDecoder.decode(bytes.slice(0, 100));

  if (preview.trimStart().startsWith('<?xml') || preview.includes('<!DOCTYPE plist')) {
    return textDecoder.decode(bytes);
  }

  return await invoke<string>('convert_plist_to_xml', { data: Array.from(bytes) });
};
