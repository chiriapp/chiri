import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeMobileConfig, decodeMobileConfigXml } from '$lib/mobileconfig/decode';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));

describe('decodeMobileConfigXml', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('decodes XML profiles locally', async () => {
    const xml = '<?xml version="1.0"?><plist><dict/></plist>';

    await expect(decodeMobileConfigXml(new TextEncoder().encode(xml))).resolves.toBe(xml);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('delegates non-XML containers to the Rust plist converter', async () => {
    mocks.invoke.mockResolvedValue('<plist/>');

    await expect(decodeMobileConfigXml(new Uint8Array([0x62, 0x70]))).resolves.toBe('<plist/>');
    expect(mocks.invoke).toHaveBeenCalledWith('convert_plist_to_xml', { data: [0x62, 0x70] });
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
