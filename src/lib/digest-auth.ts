const md5 = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  const msgLen = bytes.length;
  const bitLen = msgLen * 8;

  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const data = new Uint8Array(msgLen + padLen + 8);
  data.set(bytes);
  data[msgLen] = 0x80;
  const dv = new DataView(data.buffer);
  dv.setUint32(msgLen + padLen, bitLen >>> 0, true);
  dv.setUint32(msgLen + padLen + 4, Math.floor(bitLen / 2 ** 32), true);

  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;

  for (let o = 0; o < data.length; o += 64) {
    const M = Array.from({ length: 16 }, (_, i) => dv.getUint32(o + i * 4, true));
    let A = a,
      B = b,
      C = c,
      D = d;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }

    a = (a + A) >>> 0;
    b = (b + B) >>> 0;
    c = (c + C) >>> 0;
    d = (d + D) >>> 0;
  }

  const r = new Uint8Array(16);
  const rv = new DataView(r.buffer);
  rv.setUint32(0, a, true);
  rv.setUint32(4, b, true);
  rv.setUint32(8, c, true);
  rv.setUint32(12, d, true);
  return Array.from(r, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export interface DigestChallenge {
  realm: string;
  nonce: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
}

export const parseDigestChallenge = (header: string): DigestChallenge | null => {
  if (!header.toLowerCase().startsWith('digest ')) return null;

  const params: Record<string, string> = {};
  for (const match of header.slice(7).matchAll(/(\w+)=(?:"([^"]*?)"|([^,\s]+))/g)) {
    params[match[1].toLowerCase()] = match[2] ?? match[3];
  }

  if (!params.realm || !params.nonce) return null;

  return {
    realm: params.realm,
    nonce: params.nonce,
    opaque: params.opaque,
    qop: params.qop,
    algorithm: params.algorithm,
  };
};

export const buildDigestAuth = (
  method: string,
  url: string,
  username: string,
  password: string,
  challenge: DigestChallenge,
) => {
  let uri: string;
  try {
    const parsed = new URL(url);
    uri = parsed.pathname + parsed.search;
  } catch {
    uri = url;
  }

  const ha1 = md5(`${username}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);

  const useQop = challenge.qop
    ?.split(',')
    .map((s) => s.trim())
    .includes('auth');

  let response: string;
  let nc: string | undefined;
  let cnonce: string | undefined;

  if (useQop) {
    nc = '00000001';
    cnonce = Math.random().toString(16).slice(2, 10);
    response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`);
  } else {
    response = md5(`${ha1}:${challenge.nonce}:${ha2}`);
  }

  const parts = [
    `username="${username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];

  if (useQop) parts.push('qop=auth', `nc=${nc}`, `cnonce="${cnonce}"`);
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);
  if (challenge.algorithm) parts.push(`algorithm=${challenge.algorithm}`);

  return `Digest ${parts.join(', ')}`;
};
