import type { WebPushKeyPair } from '$types/push';

/**
 * generate a Web Push key pair using the Web Crypto API
 */
export const generateWebPushKeyPair = async (): Promise<WebPushKeyPair> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKey = base64UrlEncode(new Uint8Array(publicKeyBuffer));

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKey = base64UrlEncode(new Uint8Array(privateKeyBuffer));

  const authSecretBuffer = crypto.getRandomValues(new Uint8Array(16));
  const authSecret = base64UrlEncode(authSecretBuffer);

  return {
    publicKey,
    privateKey,
    authSecret,
  };
};

export const base64UrlEncode = (data: Uint8Array) => {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const base64UrlDecode = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  return Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
};
