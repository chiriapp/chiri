import { invoke } from '@tauri-apps/api/core';
import type { MobileConfigDecodeResult } from '$types/mobileconfig';

/** decode a configuration profile into typed CalDAV payload candidates */
export const decodeMobileConfig = async (bytes: Uint8Array) =>
  await invoke<MobileConfigDecodeResult>('decode_mobile_config', { data: Array.from(bytes) });
