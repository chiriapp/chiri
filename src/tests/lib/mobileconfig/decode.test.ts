import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeMobileConfig } from '$lib/mobileconfig/decode';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));

describe('decodeMobileConfig', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('delegates typed decoding to the bounded Rust decoder', async () => {
    const result = {
      ok: true,
      profile: { format: 'xml', signature: 'unsigned', caldavPayloads: [] },
    };
    mocks.invoke.mockResolvedValue(result);

    await expect(decodeMobileConfig(new Uint8Array([1, 2, 3]))).resolves.toBe(result);
    expect(mocks.invoke).toHaveBeenCalledWith('decode_mobile_config', { data: [1, 2, 3] });
  });
});
