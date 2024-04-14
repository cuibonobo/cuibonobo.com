export const getNormalizedPath = (absPath: string, basePath: string): string => {
  let relPath = absPath;
  if (absPath.startsWith(basePath)) {
    relPath = relPath.substring(basePath.length);
  }
  if (relPath.startsWith('/')) {
    relPath = relPath.substring(1);
  }
  if (relPath.endsWith('/')) {
    relPath = relPath.substring(0, relPath.length - 1);
  }
  return relPath;
};

export const getHash = (digest: ArrayBuffer): string => {
  const array = Array.from(new Uint8Array(digest));
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const getDigest = async (file: File): Promise<ArrayBuffer> => {
  const fileData = await file.arrayBuffer();
  return await crypto.subtle.digest('SHA-256', fileData);
};
