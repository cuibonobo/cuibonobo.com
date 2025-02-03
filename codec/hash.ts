// Below is why 'nodejs_compat' flag is needed in Wrangler config
import crypto from 'crypto';

export const getDigestHash = (digest: ArrayBuffer): string => {
  const array = Array.from(new Uint8Array(digest));
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const getBufferDigest = async (
  buffer: ArrayBuffer,
  algo: AlgorithmIdentifier = 'SHA-256'
): Promise<ArrayBuffer> => {
  return await crypto.subtle.digest(algo, buffer);
};

export const getFileDigest = async (file: File): Promise<ArrayBuffer> => {
  return getBufferDigest(await file.arrayBuffer());
};

const getStringDigest = async (text: string): Promise<ArrayBuffer> => {
  return getBufferDigest(new TextEncoder().encode(text));
};

export const getStringHash = async (text: string): Promise<string> => {
  return getDigestHash(await getStringDigest(text));
};
